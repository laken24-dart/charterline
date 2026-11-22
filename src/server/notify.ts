/**
 * Transactional email through the DeepSpace `email/send` integration.
 *
 * Sends are billed to the app owner (developer billing, the default for
 * integrations not listed in src/integrations.ts) and go out from the
 * platform sender; `reply_to` is left unset so nobody's address leaks to the
 * other party. Email is a side channel: a failed send is logged and never
 * fails the action that triggered it, because the in-app thread already holds
 * the same event.
 */

import type { ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'

interface UserRow {
  email?: string
  name?: string
}

/** Server-only lookup: actions run RBAC-off, so this reads the full users row. */
async function emailFor(tools: ActionTools, userId: string): Promise<string | null> {
  if (!userId) return null
  const res = await tools.get('users', userId)
  if (!res.success) return null
  const record = (res.data as { record?: { data?: UserRow } }).record
  const email = record?.data?.email?.trim()
  return email && email.includes('@') ? email : null
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function appUrl(env: Env, path = '/'): string {
  return `https://${env.APP_NAME}.app.space${path}`
}

export interface Notice {
  subject: string
  /** Plain paragraphs; rendered as text and as escaped HTML. */
  lines: string[]
  cta?: { label: string; path: string }
}

export async function notifyUser(tools: ActionTools, env: Env, userId: string, notice: Notice): Promise<void> {
  try {
    const to = await emailFor(tools, userId)
    if (!to) return
    const link = notice.cta ? appUrl(env, notice.cta.path) : null
    const text = [...notice.lines, ...(link ? ['', `${notice.cta!.label}: ${link}`] : []), '', '— Charterline'].join('\n')
    const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;max-width:520px">
${notice.lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join('\n')}
${link ? `<p style="margin:20px 0"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(notice.cta!.label)}</a></p>` : ''}
<p style="margin:24px 0 0;color:#64748b;font-size:13px">Charterline · contract pilot jobs for private aviation</p>
</div>`
    const res = await tools.integration('email/send', {
      from: 'Charterline <charterline@app.space>',
      to,
      subject: notice.subject,
      text,
      html,
    })
    if (!res.success) console.warn(`[notify] email/send failed: ${res.error}`)
  } catch (err) {
    console.warn(`[notify] email/send threw: ${err instanceof Error ? err.message : String(err)}`)
  }
}
