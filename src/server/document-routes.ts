/**
 * GET /api/documents/:id/file — stream a pilot's certificate.
 *
 * Certificates live in the pilot's PRIVATE R2 folder (useR2Files scope
 * 'self'), which the platform serves to that pilot alone. This route is the
 * one other door: it serves the bytes to a caller who is either the owner or
 * listed in the document's `sharedWith` — which only the `applyToTrip` action
 * writes, adding the operator of the trip the pilot applied to. The app owner
 * gets nothing extra here.
 */

import type { Hono } from 'hono'
import { appFiles, AppFileError } from 'deepspace/worker'
import type { VerifyResult } from 'deepspace/worker'
import type { AppContext, Env } from '../../worker.js'
import type { DocumentRow } from '../schemas/aviation-schemas.js'
import { createActionTools } from './action-routes.js'

type ResolveAuth = (req: Request, env: Env) => Promise<VerifyResult | null>

export function registerDocumentRoutes(app: Hono<AppContext>, resolveAuth: ResolveAuth): void {
  app.get('/api/documents/:id/file', async (c) => {
    const auth = await resolveAuth(c.req.raw, c.env)
    if (!auth) return c.json({ error: 'Unauthorized' }, 401)

    const tools = createActionTools(c.env, auth.userId, '')
    const res = await tools.get('documents', c.req.param('id'))
    const record = res.success
      ? (res.data as unknown as { record?: { recordId: string; data: DocumentRow } }).record
      : undefined
    // Same answer for "missing" and "not yours", so ids can't be probed.
    if (!record) return c.json({ error: 'not_found' }, 404)
    const doc = record.data
    const ownerId = doc.ownerId ?? ''
    const allowed = auth.userId === ownerId || (doc.sharedWith ?? []).includes(auth.userId)
    if (!ownerId || !allowed) return c.json({ error: 'not_found' }, 404)

    // The key must sit in the owner's own folder; appFiles scopes the read to
    // that user as well, so a forged key cannot reach anyone else's files.
    if (!doc.fileKey.includes(`/users/${ownerId}/`)) return c.json({ error: 'not_found' }, 404)

    console.info(`[document] ${record.recordId} read by ${auth.userId} (owner ${ownerId})`)
    try {
      const file = await appFiles(c.env, { scope: 'self', userId: ownerId }).download(doc.fileKey)
      const headers = new Headers()
      headers.set('Content-Type', doc.mimeType || file.headers.get('content-type') || 'application/octet-stream')
      const safeName = (doc.fileName || 'document').replace(/[^\w.\- ]+/g, '_')
      headers.set('Content-Disposition', `inline; filename="${safeName}"`)
      headers.set('Cache-Control', 'private, no-store')
      headers.set('X-Content-Type-Options', 'nosniff')
      return new Response(file.body, { status: 200, headers })
    } catch (err) {
      if (err instanceof AppFileError && err.status === 404) return c.json({ error: 'not_found' }, 404)
      throw err
    }
  })
}
