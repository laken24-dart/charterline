import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { Plus } from 'lucide-react'
import { Empty, Panel, PanelHeader, Route, StatusPill } from '../../../components/bits'
import { dateRange, formatDateTime, timeAgo, useMyProfile, usd } from '../../../lib/client'
import type { Application, DocumentRow, Trip } from '../../../schemas/aviation-schemas'

export default function Dashboard() {
  const { profile, loading } = useMyProfile()
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  if (!profile) return <Navigate to="/profile" replace />
  return profile.accountType === 'operator' ? <OperatorDashboard /> : <CrewDashboard />
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function ApplicationList({ apps, perspective }: { apps: { recordId: string; createdAt: string; data: Application }[]; perspective: 'operator' | 'crew' }) {
  return (
    <ul className="divide-y divide-border">
      {apps.map((a) => {
        const [from, to] = (a.data.route ?? ' → ').split(' → ')
        return (
          <li key={a.recordId}>
            <Link to={`/applications/${a.recordId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{perspective === 'operator' ? a.data.pilotName : a.data.tripTitle}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {perspective === 'operator' ? a.data.tripTitle : a.data.company} · <Route from={from} to={to} className="text-xs" />
                  {a.data.interviewAt ? ` · Interview ${formatDateTime(a.data.interviewAt)}` : ''}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">{timeAgo(a.data.lastMessageAt ?? a.createdAt)}</span>
              <StatusPill status={a.data.status} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function useApps() {
  const { records, status } = useQuery<Application>('applications', { limit: 500 })
  const sorted = useMemo(
    () => [...records].sort((a, b) => (b.data.lastMessageAt ?? b.createdAt).localeCompare(a.data.lastMessageAt ?? a.createdAt)),
    [records],
  )
  return { apps: sorted, status }
}

function OperatorDashboard() {
  const { userId, profile } = useMyProfile()
  const { records: trips, status } = useQuery<Trip>('trips', { where: { operatorId: userId ?? '__none__' }, orderBy: 'createdAt', orderDir: 'desc' })
  const { apps } = useApps()
  const mine = apps.filter((a) => a.data.operatorId === userId)
  const byTrip = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of mine) m.set(a.data.tripId, (m.get(a.data.tripId) ?? 0) + 1)
    return m
  }, [mine])
  const open = trips.filter((t) => t.data.status === 'open').length
  const interviews = mine.filter((a) => a.data.interviewAt && a.data.interviewAt > new Date().toISOString()).length

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{profile?.company || profile?.displayName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Operator dashboard</h1>
        </div>
        <Link to="/post" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="post-trip-link">
          <Plus className="h-4 w-4" /> Post a trip
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Open trips" value={open} />
        <Stat label="Applicants" value={mine.length} />
        <Stat label="Upcoming interviews" value={interviews} />
      </div>

      <Panel className="mt-6">
        <PanelHeader title="Your trips" />
        {status === 'loading' ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : trips.length === 0 ? (
          <Empty title="No trips posted" body="Post a contract trip and it appears on every pilot's live map." action={<Link to="/post" className="text-sm text-primary hover:underline">Post a trip →</Link>} />
        ) : (
          <ul className="divide-y divide-border">
            {trips.map((t) => (
              <li key={t.recordId}>
                <Link to={`/trips/${t.recordId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.data.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Route from={t.data.origin} to={t.data.destination} className="text-xs" /> · {t.data.aircraft} · {dateRange(t.data.startDate, t.data.endDate)} · {usd(t.data.dayRate)}/day
                    </p>
                  </div>
                  <span className="tabular text-xs text-muted-foreground">{byTrip.get(t.recordId) ?? 0} applicants</span>
                  <StatusPill status={t.data.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-6">
        <PanelHeader title="Recent applicants" />
        {mine.length === 0 ? <Empty title="No applicants yet" /> : <ApplicationList apps={mine.slice(0, 15)} perspective="operator" />}
      </Panel>
    </div>
  )
}

function CrewDashboard() {
  const { userId, profile } = useMyProfile()
  const { apps, status } = useApps()
  const mine = apps.filter((a) => a.data.pilotId === userId)
  const { records: docs } = useQuery<DocumentRow>('documents', { where: { ownerId: userId ?? '__none__' } })
  const active = mine.filter((a) => !['declined', 'withdrawn'].includes(a.data.status)).length
  const interviews = mine.filter((a) => a.data.interviewAt && a.data.interviewAt > new Date().toISOString()).length

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{profile?.displayName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your applications</h1>
        </div>
        <Link to="/home" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Find trips
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Active" value={active} />
        <Stat label="Interviews booked" value={interviews} />
        <Stat label="Documents" value={docs.length} />
      </div>
      {docs.length === 0 && (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Upload your certificates before applying. <Link to="/documents" className="underline">Go to documents →</Link>
        </p>
      )}
      <Panel className="mt-6">
        <PanelHeader title="Applications" />
        {status === 'loading' ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : mine.length === 0 ? (
          <Empty title="You haven't applied to anything yet" body="Browse the live board and apply with your certificates." action={<Link to="/home" className="text-sm text-primary hover:underline">Open the board →</Link>} />
        ) : (
          <ApplicationList apps={mine} perspective="crew" />
        )}
      </Panel>
    </div>
  )
}
