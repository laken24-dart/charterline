import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthOverlay, useMutations, useQuery } from 'deepspace'
import { ArrowLeft, CalendarPlus, CloudSun, FileText, Trash2, Wind } from 'lucide-react'
import { Button, Textarea, useToast } from '@/components/ui'
import { TripMap } from '../../../components/TripMap'
import { Empty, Field, Panel, PanelHeader, Route, StatusPill } from '../../../components/bits'
import {
  callAction,
  dateRange,
  formatDateTime,
  timeAgo,
  tripDays,
  useMyProfile,
  usd,
} from '../../../lib/client'
import { findAirport, ratingCode } from '../../../lib/airports'
import { compass, useWeather } from '../../../lib/integration-client'
import type { Application, DocumentRow, Slot, Trip } from '../../../schemas/aviation-schemas'

export default function TripPage() {
  const { id = '' } = useParams()
  const { records, status } = useQuery<Trip>('trips', { limit: 500 })
  const trip = records.find((r) => r.recordId === id)
  const me = useMyProfile()

  if (status === 'loading') {
    return <div className="p-8 text-sm text-muted-foreground">Loading trip…</div>
  }
  if (!trip) {
    return (
      <Empty
        title="Trip not found"
        body="It may have been removed by the operator."
        action={<Link to="/home" className="text-sm text-primary hover:underline">Back to the board</Link>}
      />
    )
  }
  const d = trip.data
  const isOwner = me.userId === d.operatorId
  const days = tripDays(d.startDate, d.endDate)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/home" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Board
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={d.status} />
                <span className="text-xs text-muted-foreground">Posted {timeAgo(trip.createdAt)}</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{d.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{d.company}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Stat label="Route" value={<Route from={d.origin} to={d.destination} />} />
                <Stat label="Day rate" value={<span className="tabular">{usd(d.dayRate)}</span>} />
                <Stat label="Dates" value={<span className="tabular">{dateRange(d.startDate, d.endDate)}</span>} sub={`${days} day${days === 1 ? '' : 's'} · ${usd((d.dayRate ?? 0) * days)} total`} />
                <Stat label="Aircraft" value={d.aircraft} />
                <Stat label="Type rating" value={<span className="font-code">{ratingCode(d.typeRating)}</span>} sub={d.typeRating.split(' (')[1]?.replace(')', '')} />
                <Stat label="Seat" value={d.seat ?? 'Either'} />
                <Stat label="Min. total time" value={d.minHours ? `${d.minHours.toLocaleString()} hrs` : '—'} />
              </dl>
              <div className="mt-5 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p><span className="font-code text-foreground">{d.origin}</span> {d.originName}</p>
                <p><span className="font-code text-foreground">{d.destination}</span> {d.destinationName}</p>
              </div>
              {d.notes && <p className="mt-5 whitespace-pre-wrap border-t border-border pt-4 text-sm text-foreground/90">{d.notes}</p>}
            </div>
            <TripMap trips={[trip]} selectedId={trip.recordId} className="h-64 border-t border-border" />
          </Panel>

          {isOwner && <OwnerApplicants tripId={trip.recordId} />}
        </div>

        <div className="space-y-6">
          <FieldWeather origin={d.origin} destination={d.destination} signedIn={!!me.isSignedIn} />
          {isOwner ? (
            <>
              <OwnerTripControls tripId={trip.recordId} status={d.status} />
              <SlotManager tripId={trip.recordId} />
            </>
          ) : (
            <ApplyPanel trip={trip} />
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

// ── Field weather (openweathermap integration) ─────────────────────────────

function FieldWeather({ origin, destination, signedIn }: { origin: string; destination: string; signedIn: boolean }) {
  return (
    <Panel>
      <PanelHeader title="Current field weather" />
      {signedIn ? (
        <div className="divide-y divide-border">
          <AirportWeather icao={origin} />
          {destination !== origin && <AirportWeather icao={destination} />}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">Sign in to see live conditions at both airports.</p>
      )}
    </Panel>
  )
}

function AirportWeather({ icao }: { icao: string }) {
  const airport = findAirport(icao)
  const { status, data } = useWeather(airport?.city, !!airport)
  return (
    <div className="flex items-center gap-3 px-4 py-3" data-testid="airport-weather">
      <span className="font-code w-12 shrink-0 text-sm text-foreground">{icao}</span>
      {status === 'ready' && data ? (
        <>
          {data.icon ? (
            <img src={`https://openweathermap.org/img/wn/${data.icon}.png`} alt="" className="h-8 w-8 shrink-0" />
          ) : (
            <CloudSun className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium capitalize text-foreground">
              <span className="tabular">{Math.round(data.temp)}°F</span> · {data.description}
            </p>
            <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {typeof data.wind_speed === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Wind className="h-3 w-3" /> {compass(data.wind_deg)} {Math.round(data.wind_speed)} mph
                </span>
              )}
              {typeof data.visibility === 'number' && <span>Vis {(data.visibility / 1609).toFixed(data.visibility >= 16090 ? 0 : 1)} mi</span>}
              {typeof data.humidity === 'number' && <span>{data.humidity}% RH</span>}
            </p>
          </div>
        </>
      ) : (
        <p className="flex-1 text-xs text-muted-foreground">
          {status === 'error' ? 'Weather unavailable for this field.' : 'Loading conditions…'}
        </p>
      )}
    </div>
  )
}

// ── Crew side ──────────────────────────────────────────────────────────────

function ApplyPanel({ trip }: { trip: { recordId: string; data: Trip } }) {
  const me = useMyProfile()
  const navigate = useNavigate()
  const toast = useToast()
  const [showAuth, setShowAuth] = useState(false)
  const { records: docs, status: docsStatus } = useQuery<DocumentRow>('documents', {
    where: { ownerId: me.userId ?? '__none__' },
  })
  const { records: apps } = useQuery<Application>('applications', {
    where: { tripId: trip.recordId, pilotId: me.userId ?? '__none__' },
    limit: 1,
  })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (!me.isSignedIn) {
    return (
      <Panel className="p-5">
        <h2 className="text-sm font-semibold">Interested in this trip?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with a crew account to apply with your certificates.</p>
        <Button className="mt-4 w-full" onClick={() => setShowAuth(true)}>Sign in to apply</Button>
        {showAuth && <AuthOverlay onClose={() => setShowAuth(false)} />}
      </Panel>
    )
  }
  if (me.loading) return <Panel className="p-5 text-sm text-muted-foreground">Loading…</Panel>
  if (!me.profile) {
    return (
      <Panel className="p-5">
        <h2 className="text-sm font-semibold">Finish your profile first</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us whether you fly or hire, then come back to apply.</p>
        <Link to="/profile" className="mt-4 inline-flex text-sm text-primary hover:underline">Set up profile →</Link>
      </Panel>
    )
  }
  if (me.profile.accountType === 'operator') {
    return (
      <Panel className="p-5 text-sm text-muted-foreground">
        You're signed in as an operator. Crew accounts apply to trips; you can{' '}
        <Link to="/post" className="text-primary hover:underline">post your own</Link>.
      </Panel>
    )
  }
  const existing = apps[0]
  if (existing) {
    return (
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your application</h2>
          <StatusPill status={existing.data.status} />
        </div>
        {existing.data.interviewAt && (
          <p className="mt-2 text-sm text-foreground">Interview: {formatDateTime(existing.data.interviewAt)}</p>
        )}
        <Link
          to={`/applications/${existing.recordId}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Open conversation
        </Link>
      </Panel>
    )
  }
  if (trip.data.status !== 'open') {
    return <Panel className="p-5 text-sm text-muted-foreground">This trip is no longer taking applications.</Panel>
  }

  const myRatings = new Set((me.profile.typeRatings ?? []).map(ratingCode))
  const hasRating = myRatings.has(ratingCode(trip.data.typeRating))

  async function submit() {
    setBusy(true)
    const res = await callAction<{ recordId: string }>('applyToTrip', {
      tripId: trip.recordId,
      documentIds: [...picked],
      note,
    })
    setBusy(false)
    if (!res.success || !res.data) return toast.error('Could not apply', res.error ?? '')
    toast.success('Application sent', 'The operator can now see the documents you attached.')
    navigate(`/applications/${res.data.recordId}`)
  }

  return (
    <Panel>
      <PanelHeader title="Apply" />
      <div className="space-y-4 p-4">
        {!hasRating && (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            This trip requires a <span className="font-code">{ratingCode(trip.data.typeRating)}</span> type rating, which isn't on your profile.
          </p>
        )}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Attach documents</p>
          {docsStatus === 'loading' ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents yet.{' '}
              <Link to="/documents" className="text-primary hover:underline">Upload your certificates</Link> first.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {docs.map((doc) => (
                <li key={doc.recordId}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40">
                    <input
                      type="checkbox"
                      className="accent-[#1d4ed8]"
                      checked={picked.has(doc.recordId)}
                      onChange={(e) => {
                        const next = new Set(picked)
                        if (e.target.checked) next.add(doc.recordId)
                        else next.delete(doc.recordId)
                        setPicked(next)
                      }}
                    />
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{doc.data.label || doc.data.kind}</span>
                    <span className="text-[11px] text-muted-foreground">{doc.data.kind}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Only this operator will be able to open what you attach.</p>
        </div>
        <Field label="Note to operator">
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recent time in type, availability, currency…" />
        </Field>
        <Button className="w-full" loading={busy} disabled={picked.size === 0} onClick={submit} data-testid="submit-application">
          Send application
        </Button>
      </div>
    </Panel>
  )
}

// ── Operator side ──────────────────────────────────────────────────────────

function OwnerTripControls({ tripId, status }: { tripId: string; status?: Trip['status'] }) {
  const { ready, putConfirmed, removeConfirmed } = useMutations<Trip>('trips')
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  async function setStatus(s: NonNullable<Trip['status']>) {
    setBusy(true)
    try {
      await putConfirmed(tripId, { status: s })
    } catch (e) {
      toast.error('Could not update', String(e))
    }
    setBusy(false)
  }
  async function remove() {
    if (!confirm('Delete this trip? Applicants keep their conversation history.')) return
    try {
      await removeConfirmed(tripId)
      navigate('/dashboard')
    } catch (e) {
      toast.error('Could not delete', String(e))
    }
  }
  return (
    <Panel>
      <PanelHeader title="Your posting" />
      <div className="flex flex-wrap gap-2 p-4">
        {status !== 'open' && (
          <Button size="sm" disabled={!ready || busy} onClick={() => setStatus('open')}>Reopen</Button>
        )}
        {status === 'open' && (
          <Button size="sm" variant="outline" disabled={!ready || busy} onClick={() => setStatus('closed')}>Close applications</Button>
        )}
        {status !== 'filled' && (
          <Button size="sm" variant="outline" disabled={!ready || busy} onClick={() => setStatus('filled')}>Mark filled</Button>
        )}
        <Button size="sm" variant="ghost" className="text-destructive" disabled={!ready} onClick={remove}>
          <Trash2 /> Delete
        </Button>
      </div>
    </Panel>
  )
}

function OwnerApplicants({ tripId }: { tripId: string }) {
  const { records, status } = useQuery<Application>('applications', { where: { tripId } })
  const sorted = useMemo(
    () => [...records].sort((a, b) => (b.data.lastMessageAt ?? b.createdAt).localeCompare(a.data.lastMessageAt ?? a.createdAt)),
    [records],
  )
  return (
    <Panel>
      <PanelHeader title={`Applicants${records.length ? ` · ${records.length}` : ''}`} />
      {status === 'loading' ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <Empty title="No applicants yet" body="Pilots who apply show up here instantly, with the certificates they attached." />
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((a) => (
            <li key={a.recordId}>
              <Link to={`/applications/${a.recordId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.data.pilotName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.data.documentIds?.length ?? 0} document{a.data.documentIds?.length === 1 ? '' : 's'}
                    {a.data.interviewAt ? ` · Interview ${formatDateTime(a.data.interviewAt)}` : ''}
                  </p>
                </div>
                <StatusPill status={a.data.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function SlotManager({ tripId }: { tripId: string }) {
  const { records } = useQuery<Slot>('slots', { where: { tripId } })
  const toast = useToast()
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState(30)
  const [busy, setBusy] = useState(false)
  const slots = [...records].sort((a, b) => a.data.startsAt.localeCompare(b.data.startsAt))

  async function add() {
    if (!when) return
    setBusy(true)
    const res = await callAction('createSlots', {
      tripId,
      slots: [new Date(when).toISOString()],
      durationMin: duration,
    })
    setBusy(false)
    if (!res.success) return toast.error('Could not add slot', res.error ?? '')
    setWhen('')
  }
  async function del(slotId: string) {
    const res = await callAction('deleteSlot', { slotId })
    if (!res.success) toast.error('Could not remove slot', res.error ?? '')
  }

  return (
    <Panel>
      <PanelHeader title="Interview slots" />
      <div className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">Applicants book one of these from their conversation. Times show in each viewer's local zone.</p>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Slot start"
          />
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Duration"
          >
            {[15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
          <Button size="sm" onClick={add} loading={busy} disabled={!when} aria-label="Add slot">
            <CalendarPlus />
          </Button>
        </div>
        {slots.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No slots yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {slots.map((s) => (
              <li key={s.recordId} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span className="tabular flex-1">{formatDateTime(s.data.startsAt)}</span>
                <span className="text-xs text-muted-foreground">{s.data.durationMin}m</span>
                <StatusPill status={s.data.status === 'booked' ? 'interview' : 'open'} className="normal-case" />
                {s.data.status !== 'booked' && (
                  <button onClick={() => del(s.recordId)} className="text-muted-foreground hover:text-destructive" aria-label="Remove slot">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
