import { useAuth, useQuery, getAuthToken } from 'deepspace'
import type { Profile } from '../schemas/aviation-schemas'

export type ActionResponse<T = unknown> = { success: boolean; data?: T; error?: string }

/** POST /api/actions/:name with the caller's JWT. Never throws. */
export async function callAction<T = unknown>(
  name: string,
  params: Record<string, unknown>,
): Promise<ActionResponse<T>> {
  try {
    const token = await getAuthToken()
    if (!token) return { success: false, error: 'Please sign in first.' }
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    const body = (await res.json().catch(() => null)) as ActionResponse<T> | null
    if (!body) return { success: false, error: `Request failed (${res.status})` }
    return body
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/** The signed-in user's Charterline profile (role + résumé), if they have one. */
export function useMyProfile() {
  const { userId, isSignedIn, isLoaded } = useAuth()
  const { records, status } = useQuery<Profile>('profiles', {
    where: { userId: userId ?? '__none__' },
    limit: 1,
  })
  const record = isSignedIn ? records[0] : undefined
  return {
    userId,
    isSignedIn,
    loading: !isLoaded || (isSignedIn && status === 'loading'),
    profile: record?.data ?? null,
    profileId: record?.recordId ?? null,
  }
}

/** Open a certificate through the permission-checked worker route. */
export async function openDocument(documentId: string): Promise<string | null> {
  // Open the tab synchronously, inside the click, so popup blockers allow it;
  // fill it once the permission-checked fetch returns.
  const win = window.open('', '_blank')
  const fail = (msg: string) => {
    win?.close()
    return msg
  }
  try {
    const token = await getAuthToken()
    if (!token) return fail('Please sign in first.')
    const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return fail(res.status === 404 ? 'You do not have access to this document.' : `Could not open (${res.status})`)
    }
    const url = URL.createObjectURL(await res.blob())
    if (win) {
      win.opener = null
      win.location.href = url
    } else {
      window.location.assign(url)
    }
    setTimeout(() => URL.revokeObjectURL(url), 120_000)
    return null
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not open document')
  }
}

export const usd = (n: number | undefined) =>
  typeof n === 'number'
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—'

export function formatDate(d: string | undefined) {
  if (!d) return '—'
  const dt = new Date(`${d}T12:00:00Z`)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function dateRange(a?: string, b?: string) {
  if (!a) return '—'
  return a === b || !b ? formatDate(a) : `${formatDate(a)} – ${formatDate(b)}`
}

export function tripDays(a?: string, b?: string) {
  if (!a || !b) return 0
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1
}

export function formatDateTime(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string | undefined) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-secondary text-secondary-foreground',
  shortlisted: 'bg-info/15 text-info',
  interview: 'bg-primary/15 text-primary',
  hired: 'bg-success/15 text-success',
  declined: 'bg-destructive/15 text-destructive',
  withdrawn: 'bg-muted text-muted-foreground',
  open: 'bg-success/15 text-success',
  filled: 'bg-primary/15 text-primary',
  closed: 'bg-muted text-muted-foreground',
}

// Dev/test only: lets Playwright call protected routes as the signed-in user.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __getAuthToken?: typeof getAuthToken }).__getAuthToken = getAuthToken
}
