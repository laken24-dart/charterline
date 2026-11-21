/**
 * Crew document vault. Files go to the pilot's PRIVATE R2 folder
 * (useR2Files default scope 'self'); a sidecar `documents` record carries
 * the metadata. Operators gain access to a document only when the pilot
 * attaches it to an application for that operator's trip.
 */

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatFileSize, useMutations, useQuery, useR2Files } from 'deepspace'
import { Eye, FileText, Lock, Trash2, Upload, Users } from 'lucide-react'
import { Button, Input, useToast } from '@/components/ui'
import { Empty, Field, NativeSelect, Panel, PanelHeader } from '../../../components/bits'
import { formatDate, openDocument, useMyProfile } from '../../../lib/client'
import { DOCUMENT_KINDS, type DocumentRow } from '../../../schemas/aviation-schemas'

const MAX_BYTES = 15 * 1024 * 1024
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/heic,image/webp'

export default function Documents() {
  const { userId, profile, loading } = useMyProfile()
  const toast = useToast()
  const { upload, deleteFile, isUploading } = useR2Files()
  const { ready, createConfirmed, removeConfirmed } = useMutations<DocumentRow>('documents')
  const { records, status } = useQuery<DocumentRow>('documents', {
    where: { ownerId: userId ?? '__none__' },
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<DocumentRow['kind']>('Pilot certificate')
  const [label, setLabel] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  if (profile?.accountType !== 'crew') {
    return (
      <Empty
        title="Documents are for crew accounts"
        body={profile ? 'Operators see applicant documents inside each application.' : 'Set up a crew account to upload certificates.'}
        action={<Link to={profile ? '/dashboard' : '/profile'} className="text-sm text-primary hover:underline">{profile ? 'Go to dashboard' : 'Set up account'} →</Link>}
      />
    )
  }

  async function save() {
    if (!file) return
    if (file.size > MAX_BYTES) return toast.error('File too large', 'Keep documents under 15 MB.')
    setBusy(true)
    const res = await upload(file, file.name)
    if (!res.success || !res.key) {
      setBusy(false)
      return toast.error('Upload failed', res.error ?? '')
    }
    try {
      await createConfirmed({
        kind,
        label: label.trim() || file.name,
        fileKey: res.key,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        expiresOn: expiresOn || undefined,
      } as DocumentRow)
      setFile(null)
      setLabel('')
      setExpiresOn('')
      if (fileInput.current) fileInput.current.value = ''
      toast.success('Document saved', 'Private to you until you attach it to an application.')
    } catch (e) {
      await deleteFile(res.key)
      toast.error('Could not save document', e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  async function remove(doc: { recordId: string; data: DocumentRow }) {
    if (!confirm(`Delete “${doc.data.label}”? Operators you shared it with will lose access too.`)) return
    try {
      await removeConfirmed(doc.recordId)
      await deleteFile(doc.data.fileKey)
    } catch (e) {
      toast.error('Could not delete', e instanceof Error ? e.message : String(e))
    }
  }

  async function view(id: string) {
    const err = await openDocument(id)
    if (err) toast.error('Could not open document', err)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Certificates & documents</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Private by default. Only operators you apply to can open what you attach.
      </p>

      <Panel className="mt-6">
        <PanelHeader title="Upload" />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="File" hint="PDF or image, up to 15 MB" className="sm:col-span-2">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-foreground"
              data-testid="doc-file"
            />
          </Field>
          <Field label="Type">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as DocumentRow['kind'])}>
              {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Label">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. ATP certificate #3451234" />
          </Field>
          <Field label="Expires" hint="Optional — medicals, passports">
            <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </Field>
          <div className="flex items-end justify-end">
            <Button onClick={save} disabled={!file || !ready} loading={busy || isUploading} data-testid="doc-save">
              <Upload /> Upload document
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="mt-6">
        <PanelHeader title={`Your documents${records.length ? ` · ${records.length}` : ''}`} />
        {status === 'loading' ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <Empty title="Nothing uploaded yet" body="Add your pilot certificate, medical and type ratings — you'll attach them when you apply." />
        ) : (
          <ul className="divide-y divide-border">
            {records.map((doc) => {
              const shared = doc.data.sharedWith?.length ?? 0
              const expired = doc.data.expiresOn && doc.data.expiresOn < new Date().toISOString().slice(0, 10)
              return (
                <li key={doc.recordId} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.data.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.data.kind}
                      {doc.data.size ? ` · ${formatFileSize(doc.data.size)}` : ''}
                      {doc.data.expiresOn && (
                        <span className={expired ? 'text-destructive' : ''}> · {expired ? 'Expired' : 'Expires'} {formatDate(doc.data.expiresOn)}</span>
                      )}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex" title="Operators who can open this">
                    {shared ? <><Users className="h-3.5 w-3.5" /> {shared} operator{shared === 1 ? '' : 's'}</> : <><Lock className="h-3.5 w-3.5" /> Only you</>}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => view(doc.recordId)} aria-label="View"><Eye /></Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(doc)} aria-label="Delete"><Trash2 /></Button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
