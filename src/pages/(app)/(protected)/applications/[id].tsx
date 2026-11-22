/**
 * One application = a private room between a pilot and the hiring operator:
 * the message thread, the documents the pilot attached, and interview booking.
 * Every collection read here is participant-only at the RecordRoom, so a
 * third user who guesses the URL receives nothing.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ArrowLeft, CalendarCheck, CalendarPlus, Eye, FileText, Send } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Empty, Panel, PanelHeader, Route, StatusPill } from '../../../../components/bits'
import { callAction, formatDate, formatDateTime, openDocument, timeAgo, useMyProfile } from '../../../../lib/client'
import { ratingCode } from '../../../../lib/airports'
import { addToGoogleCalendar, exclusiveEndDate, type CalendarEventInput } from '../../../../lib/integration-client'
import type { AppMessage, Application, DocumentRow, Profile, Slot, Trip } from '../../../../schemas/aviation-schemas'

export default function ApplicationPage() {
  const { id = '' } = useParams()
  const { userId } = useMyProfile()
  const { records, status } = useQuery<Application>('applications', { limit: 500 })
  const app = records.find((r) => r.recordId === id)

  if (status === 'loading') return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  if (!app) {
    return (
      <Empty
        title="Application not found"
        body="Applications are visible only to the pilot and the hiring operator."
        action={<Link to="/dashboard" className="text-sm text-primary hover:underline">Back to dashboard</Link>}
      />
    )
  }
  const isOperator = userId === app.data.operatorId
  const [from, to] = (app.data.route ?? ' → ').split(' → ')

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
      <Link to="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill status={app.data.status} />
            <Route from={from} to={to} className="text-xs text-muted-foreground" />
          </div>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight">
            {isOperator ? app.data.pilotName : app.data.tripTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOperator ? (
              <>Applied to <Link to={`/trips/${app.data.tripId}`} className="text-foreground hover:underline">{app.data.tripTitle}</Link> · {timeAgo(app.createdAt)}</>
            ) : (
              <>{app.data.company} · <Link to={`/trips/${app.data.tripId}`} className="hover:underline">View trip</Link></>
            )}
          </p>
        </div>
        <StatusActions app={app} isOperator={isOperator} />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Thread applicationId={app.recordId} myId={userId ?? ''} note={app.data.note} pilotName={app.data.pilotName} />
        <div className="space-y-6">
          {app.data.status === 'hired' && <HiredTrip app={app} isOperator={isOperator} />}
          <Interview app={app} isOperator={isOperator} />
          <Documents ids={app.data.documentIds ?? []} isOperator={isOperator} />
          {isOperator && <PilotCard pilotId={app.data.pilotId} />}
        </div>
      </div>
    </div>
  )
}

function StatusActions({ app, isOperator }: { app: { recordId: string; data: Application }; isOperator: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const s = app.data.status
  async function go(status: string) {
    if (status === 'declined' && !confirm('Decline this applicant?')) return
    if (status === 'withdrawn' && !confirm('Withdraw your application?')) return
    setBusy(status)
    const res = await callAction('setApplicationStatus', { applicationId: app.recordId, status })
    setBusy(null)
    if (!res.success) toast.error('Could not update', res.error ?? '')
  }
  if (['declined', 'withdrawn', 'hired'].includes(s)) return null
  if (!isOperator) {
    return <Button size="sm" variant="outline" loading={busy === 'withdrawn'} onClick={() => go('withdrawn')}>Withdraw</Button>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {s === 'submitted' && <Button size="sm" variant="outline" loading={busy === 'shortlisted'} onClick={() => go('shortlisted')}>Shortlist</Button>}
      {s !== 'interview' && <Button size="sm" variant="outline" loading={busy === 'interview'} onClick={() => go('interview')}>Invite to interview</Button>}
      <Button size="sm" loading={busy === 'hired'} onClick={() => go('hired')} data-testid="hire">Hire</Button>
      <Button size="sm" variant="ghost" className="text-destructive" loading={busy === 'declined'} onClick={() => go('declined')}>Decline</Button>
    </div>
  )
}

function Thread({ applicationId, myId, note, pilotName }: { applicationId: string; myId: string; note?: string; pilotName?: string }) {
  const { records, status } = useQuery<AppMessage>('app-messages', { where: { applicationId }, orderBy: 'createdAt', orderDir: 'asc', limit: 500 })
  const toast = useToast()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const messages = useMemo(() => [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [records])
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and
    // an effect must return nothing or a cleanup function.
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function send() {
    const text = body.trim()
    if (!text) return
    setSending(true)
    const res = await callAction('sendMessage', { applicationId, body: text })
    setSending(false)
    if (!res.success) return toast.error('Message not sent', res.error ?? '')
    setBody('')
  }

  return (
    <Panel className="flex min-h-[420px] flex-col">
      <PanelHeader title="Messages" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" data-testid="thread">
        {note && (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Cover note from {pilotName}</p>
            <p className="whitespace-pre-wrap">{note}</p>
          </div>
        )}
        {status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
        {messages.map((m) =>
          m.data.system ? (
            <p key={m.recordId} className="text-center text-xs text-muted-foreground">
              {m.data.body} <span className="opacity-60">· {timeAgo(m.createdAt)}</span>
            </p>
          ) : (
            <div key={m.recordId} className={cn('flex', m.data.senderId === myId ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  m.data.senderId === myId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.data.body}</p>
                <p className={cn('mt-1 text-[10px]', m.data.senderId === myId ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {m.data.senderId === myId ? 'You' : m.data.senderName} · {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          ),
        )}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          data-testid="message-input"
        />
        <Button type="submit" loading={sending} disabled={!body.trim()} aria-label="Send"><Send /></Button>
      </form>
    </Panel>
  )
}

function Interview({ app, isOperator }: { app: { recordId: string; data: Application }; isOperator: boolean }) {
  const { records } = useQuery<Slot>('slots', { where: { tripId: app.data.tripId } })
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const closed = ['declined', 'withdrawn', 'hired'].includes(app.data.status)
  const now = new Date().toISOString()
  const open = records
    .filter((s) => s.data.status !== 'booked' && s.data.startsAt > now)
    .sort((a, b) => a.data.startsAt.localeCompare(b.data.startsAt))

  async function book(slotId: string) {
    setBusy(slotId)
    const res = await callAction('bookSlot', { applicationId: app.recordId, slotId })
    setBusy(null)
    if (!res.success) toast.error('Could not book', res.error ?? '')
    else toast.success('Interview booked')
  }

  return (
    <Panel>
      <PanelHeader title="Interview" />
      <div className="space-y-3 p-4">
        {app.data.interviewAt ? (
          <>
            <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span className="tabular">{formatDateTime(app.data.interviewAt)}</span>
            </div>
            <CalendarButton
              label="Add interview to Google Calendar"
              testId="calendar-interview"
              event={() => {
                const slot = records.find((s) => s.recordId === app.data.interviewSlotId)
                const start = new Date(app.data.interviewAt!)
                const end = new Date(start.getTime() + (slot?.data.durationMin ?? 30) * 60_000)
                const other = isOperator ? app.data.pilotName : app.data.company
                return {
                  title: `Charterline interview · ${app.data.tripTitle}${other ? ` · ${other}` : ''}`,
                  start: start.toISOString(),
                  end: end.toISOString(),
                  description: `Interview for ${app.data.tripTitle} (${app.data.route}).\nConversation: ${window.location.origin}/applications/${app.recordId}`,
                }
              }}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No interview booked yet.</p>
        )}
        {isOperator ? (
          <p className="text-xs text-muted-foreground">
            Manage your available times on the <Link to={`/trips/${app.data.tripId}`} className="text-primary hover:underline">trip page</Link>.
          </p>
        ) : closed ? null : open.length === 0 ? (
          <p className="text-xs text-muted-foreground">The operator hasn't published open times yet. Ask in the thread.</p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {app.data.interviewAt ? 'Reschedule to' : 'Pick a time'}
            </p>
            <ul className="space-y-1.5">
              {open.map((s) => (
                <li key={s.recordId}>
                  <button
                    onClick={() => book(s.recordId)}
                    disabled={!!busy}
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                    data-testid="book-slot"
                  >
                    <span className="tabular">{formatDateTime(s.data.startsAt)}</span>
                    <span className="text-xs text-muted-foreground">{busy === s.recordId ? 'Booking…' : `${s.data.durationMin}m`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** Put an event on the signed-in user's own Google Calendar (google integration). */
function CalendarButton({ label, event, testId }: { label: string; event: () => CalendarEventInput; testId: string }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)
  async function add() {
    setBusy(true)
    const res = await addToGoogleCalendar(event())
    setBusy(false)
    if (res.ok) {
      setAdded(true)
      toast.success('Added to Google Calendar')
      if (res.link) window.open(res.link, '_blank', 'noopener')
    } else if (res.needsConnect) {
      toast.info('Connect Google Calendar', 'Approve access in the popup, then click the button again.')
    } else {
      toast.error('Could not add to calendar', res.error)
    }
  }
  return (
    <Button size="sm" variant="outline" className="w-full" onClick={add} loading={busy} disabled={added} data-testid={testId}>
      <CalendarPlus /> {added ? 'Added to Google Calendar' : label}
    </Button>
  )
}

function HiredTrip({ app, isOperator }: { app: { recordId: string; data: Application }; isOperator: boolean }) {
  const { records } = useQuery<Trip>('trips', { limit: 500 })
  const trip = records.find((r) => r.recordId === app.data.tripId)?.data
  return (
    <Panel>
      <PanelHeader title={isOperator ? 'Crew hired' : "You're hired"} />
      <div className="space-y-3 p-4 text-sm">
        <p className="text-muted-foreground">
          {trip?.startDate ? `${formatDate(trip.startDate)} – ${formatDate(trip.endDate ?? trip.startDate)} · ${trip.aircraft}` : 'Trip details loading…'}
        </p>
        {trip?.startDate && (
          <CalendarButton
            label="Add trip to Google Calendar"
            testId="calendar-trip"
            event={() => ({
              title: `${trip.title} · ${trip.origin} → ${trip.destination}`,
              start: trip.startDate!,
              end: exclusiveEndDate(trip.endDate ?? trip.startDate!),
              allDay: true,
              location: trip.originName ? `${trip.origin} · ${trip.originName}` : trip.origin,
              description: [
                `${trip.company ?? ''} contract trip on Charterline`.trim(),
                `Aircraft: ${trip.aircraft} · ${trip.seat ?? 'Either'} seat`,
                `Crew: ${app.data.pilotName ?? ''}`,
                `Conversation: ${window.location.origin}/applications/${app.recordId}`,
              ].join('\n'),
            })}
          />
        )}
      </div>
    </Panel>
  )
}

function Documents({ ids, isOperator }: { ids: string[]; isOperator: boolean }) {
  // The room only returns documents this user may read: their own, or ones
  // shared with them through an application.
  const { records, status } = useQuery<DocumentRow>('documents')
  const toast = useToast()
  const docs = records.filter((r) => ids.includes(r.recordId))
  return (
    <Panel>
      <PanelHeader title={isOperator ? 'Applicant documents' : 'Documents you attached'} />
      {status === 'loading' ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No documents available.</p>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.recordId} className="flex items-center gap-3 px-4 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{d.data.label || d.data.kind}</p>
                <p className="text-[11px] text-muted-foreground">
                  {d.data.kind}
                  {d.data.expiresOn ? ` · exp. ${formatDate(d.data.expiresOn)}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Open document"
                data-testid="open-document"
                data-doc-id={d.recordId}
                onClick={async () => {
                  const err = await openDocument(d.recordId)
                  if (err) toast.error('Could not open', err)
                }}
              >
                <Eye />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {isOperator && <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">Visible only to you as the hiring operator.</p>}
    </Panel>
  )
}

function PilotCard({ pilotId }: { pilotId: string }) {
  const { records } = useQuery<Profile>('profiles', { where: { userId: pilotId }, limit: 1 })
  const p = records[0]?.data
  if (!p) return null
  return (
    <Panel>
      <PanelHeader title="Pilot" />
      <div className="space-y-3 p-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Certificate</p>
            <p className="mt-0.5">{p.certificate || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total time</p>
            <p className="tabular mt-0.5">{p.totalHours ? `${p.totalHours.toLocaleString()} hrs` : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Home base</p>
            <p className="font-code mt-0.5">{p.homeBase || '—'}</p>
          </div>
        </div>
        {(p.typeRatings?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.typeRatings!.map((r) => (
              <span key={r} className="font-code rounded border border-border px-1.5 py-0.5 text-[11px]">{ratingCode(r)}</span>
            ))}
          </div>
        )}
        {p.bio && <p className="whitespace-pre-wrap text-muted-foreground">{p.bio}</p>}
      </div>
    </Panel>
  )
}
