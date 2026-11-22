/**
 * Server actions. Each runs with RBAC off (see src/server/action-routes.ts), so
 * every action below establishes the caller's right to act itself: it loads
 * the caller's profile and the records involved and compares ids before any
 * write. `userId` is the verified JWT subject; nothing in `params` is trusted.
 */

import type { ActionHandler, ActionResult, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import type {
  Application,
  ApplicationStatus,
  DocumentRow,
  Profile,
  Slot,
  Trip,
} from '../schemas/aviation-schemas'
import { SEATS } from '../schemas/aviation-schemas'
import { findAirport } from '../lib/airports'
import { notifyUser } from '../server/notify'
import { draftTripDetails } from '../server/ai-draft'

interface Envelope<T> {
  recordId: string
  data: T
  createdBy?: string
}

const fail = (error: string): ActionResult<never> => ({ success: false, error })

const str = (v: unknown, max = 200): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

async function getRecord<T>(tools: ActionTools, coll: string, id: unknown): Promise<Envelope<T> | null> {
  if (typeof id !== 'string' || !id) return null
  const res = await tools.get(coll, id)
  if (!res.success) return null
  const record = (res.data as { record?: Envelope<T> }).record
  return record ?? null
}

async function getProfile(tools: ActionTools, userId: string): Promise<Profile | null> {
  const res = await tools.query('profiles', { where: { userId }, limit: 1 })
  if (!res.success) return null
  const rows = (res.data as unknown as { records: Envelope<Profile>[] }).records
  return rows[0]?.data ?? null
}

async function postSystemMessage(tools: ActionTools, app: Envelope<Application>, body: string) {
  const now = new Date().toISOString()
  await tools.create('app-messages', {
    applicationId: app.recordId,
    senderId: '',
    senderName: 'Charterline',
    body,
    system: true,
    participants: [app.data.pilotId, app.data.operatorId],
  })
  await tools.update('applications', app.recordId, { lastMessageAt: now })
}

function isoDate(v: unknown): string {
  const s = str(v, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

// ── Trips ──────────────────────────────────────────────────────────────────

const createTrip: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const profile = await getProfile(tools, userId)
  if (profile?.accountType !== 'operator') return fail('Only operator accounts can post trips.')

  const origin = findAirport(str(params.origin, 4))
  const destination = findAirport(str(params.destination, 4))
  if (!origin || !destination) return fail('Pick an origin and destination airport from the list.')
  const title = str(params.title, 120)
  const aircraft = str(params.aircraft, 80)
  const typeRating = str(params.typeRating, 80)
  if (!title || !aircraft || !typeRating) return fail('Title, aircraft and type rating are required.')
  const startDate = isoDate(params.startDate)
  const endDate = isoDate(params.endDate)
  if (!startDate || !endDate || endDate < startDate) return fail('Enter a valid date range.')
  const dayRate = Number(params.dayRate)
  if (!Number.isFinite(dayRate) || dayRate <= 0 || dayRate > 100000) return fail('Enter a day rate.')
  const minHours = Math.max(0, Math.min(50000, Number(params.minHours) || 0))
  const seat = (SEATS as readonly string[]).includes(str(params.seat)) ? str(params.seat) : 'Either'

  const trip: Trip = {
    operatorId: userId,
    company: profile.company || profile.displayName,
    title,
    origin: origin.icao,
    originName: `${origin.name}, ${origin.city}`,
    originLat: origin.lat,
    originLng: origin.lng,
    destination: destination.icao,
    destinationName: `${destination.name}, ${destination.city}`,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    aircraft,
    typeRating,
    seat: seat as Trip['seat'],
    startDate,
    endDate,
    dayRate: Math.round(dayRate),
    minHours,
    notes: str(params.notes, 2000),
    status: 'open',
  }
  return tools.create("trips", { ...trip })
}

// ── Applications ───────────────────────────────────────────────────────────

const applyToTrip: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const profile = await getProfile(tools, userId)
  if (profile?.accountType !== 'crew') return fail('Only crew accounts can apply to trips.')

  const trip = await getRecord<Trip>(tools, 'trips', params.tripId)
  if (!trip) return fail('Trip not found.')
  if (trip.data.status !== 'open') return fail('This trip is no longer taking applications.')

  const existing = await tools.query('applications', {
    where: { tripId: trip.recordId, pilotId: userId },
    limit: 1,
  })
  if (existing.success && (existing.data as { records: unknown[] }).records.length > 0) {
    return fail('You have already applied to this trip.')
  }

  const rawIds = Array.isArray(params.documentIds) ? params.documentIds.slice(0, 20) : []
  const docs: Envelope<DocumentRow>[] = []
  for (const id of rawIds) {
    const doc = await getRecord<DocumentRow>(tools, 'documents', id)
    // Only the caller's own documents can be attached.
    if (!doc || doc.data.ownerId !== userId) return fail('One of the attached documents is not yours.')
    docs.push(doc)
  }
  if (docs.length === 0) return fail('Attach at least one certificate.')

  const operatorId = trip.data.operatorId
  const created = await tools.create('applications', {
    tripId: trip.recordId,
    pilotId: userId,
    operatorId,
    tripTitle: trip.data.title,
    route: `${trip.data.origin} → ${trip.data.destination}`,
    pilotName: profile.displayName,
    company: trip.data.company,
    status: 'submitted',
    note: str(params.note, 2000),
    documentIds: docs.map((d) => d.recordId),
    participants: [userId, operatorId],
    lastMessageAt: new Date().toISOString(),
  } satisfies Application as unknown as Record<string, unknown>)
  if (!created.success) return created

  // Grant the hiring operator — and only them — read access to the attached files.
  for (const doc of docs) {
    const shared = new Set(doc.data.sharedWith ?? [])
    if (shared.has(operatorId)) continue
    shared.add(operatorId)
    await tools.update('documents', doc.recordId, { sharedWith: [...shared] })
  }

  const app = await getRecord<Application>(tools, 'applications', created.data.recordId)
  if (app) {
    await postSystemMessage(
      tools,
      app,
      `${profile.displayName} applied with ${docs.length} document${docs.length === 1 ? '' : 's'}.`,
    )
    await notifyUser(tools, env, operatorId, {
      subject: `New applicant for ${trip.data.title}`,
      lines: [
        `${profile.displayName} applied to ${trip.data.title} (${trip.data.origin} → ${trip.data.destination}).`,
        [
          profile.certificate && `${profile.certificate} certificate`,
          profile.totalHours && `${profile.totalHours.toLocaleString('en-US')} hrs total time`,
          `${docs.length} document${docs.length === 1 ? '' : 's'} attached`,
        ]
          .filter(Boolean)
          .join(' · '),
      ],
      cta: { label: 'Review application', path: `/applications/${app.recordId}` },
    })
  }
  return created
}

const OPERATOR_STATUSES: ApplicationStatus[] = ['submitted', 'shortlisted', 'interview', 'hired', 'declined']

const STATUS_EMAILS: Partial<Record<ApplicationStatus, (a: Application) => { subject: string; line: string }>> = {
  shortlisted: (a) => ({
    subject: `You're shortlisted: ${a.tripTitle}`,
    line: `${a.company || 'The operator'} shortlisted your application for ${a.tripTitle} (${a.route}).`,
  }),
  interview: (a) => ({
    subject: `Interview invitation: ${a.tripTitle}`,
    line: `${a.company || 'The operator'} invited you to interview for ${a.tripTitle}. Pick a time from their open slots.`,
  }),
  hired: (a) => ({
    subject: `You're hired: ${a.tripTitle}`,
    line: `Congratulations! ${a.company || 'The operator'} hired you for ${a.tripTitle} (${a.route}). You can add the trip to your calendar from the conversation.`,
  }),
  declined: (a) => ({
    subject: `Update on ${a.tripTitle}`,
    line: `${a.company || 'The operator'} has decided not to move forward with your application for ${a.tripTitle}. There are more trips on the board.`,
  }),
  withdrawn: (a) => ({
    subject: `${a.pilotName || 'An applicant'} withdrew from ${a.tripTitle}`,
    line: `${a.pilotName || 'An applicant'} withdrew their application for ${a.tripTitle}.`,
  }),
}

const setApplicationStatus: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const app = await getRecord<Application>(tools, 'applications', params.applicationId)
  if (!app) return fail('Application not found.')
  const status = str(params.status) as ApplicationStatus

  if (userId === app.data.operatorId) {
    if (!OPERATOR_STATUSES.includes(status)) return fail('Unsupported status.')
  } else if (userId === app.data.pilotId) {
    if (status !== 'withdrawn') return fail('Applicants can only withdraw.')
  } else {
    return fail('Not your application.')
  }
  if (app.data.status === status) return { success: true, data: { recordId: app.recordId } }

  const res = await tools.update('applications', app.recordId, { status })
  if (!res.success) return res

  if (status === 'hired') {
    await tools.update('trips', app.data.tripId, { status: 'filled' })
  }
  if ((status === 'declined' || status === 'withdrawn') && app.data.interviewSlotId) {
    await releaseBooking(tools, app)
  }
  const labels: Record<string, string> = {
    submitted: 'moved the application back to Submitted',
    shortlisted: 'shortlisted this application',
    interview: 'invited the applicant to book an interview',
    hired: 'marked this applicant as hired 🎉',
    declined: 'declined this application',
    withdrawn: 'withdrew this application',
  }
  const who = userId === app.data.operatorId ? app.data.company || 'The operator' : app.data.pilotName || 'The applicant'
  await postSystemMessage(tools, app, `${who} ${labels[status]}.`)

  const email = STATUS_EMAILS[status]?.(app.data)
  if (email) {
    // Tell the other participant: the pilot about operator decisions, the
    // operator about a withdrawal.
    const recipient = status === 'withdrawn' ? app.data.operatorId : app.data.pilotId
    await notifyUser(tools, env, recipient, {
      subject: email.subject,
      lines: [email.line],
      cta: { label: 'Open conversation', path: `/applications/${app.recordId}` },
    })
  }
  return res
}

// ── Messages ───────────────────────────────────────────────────────────────

const sendMessage: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const app = await getRecord<Application>(tools, 'applications', params.applicationId)
  if (!app) return fail('Conversation not found.')
  if (userId !== app.data.pilotId && userId !== app.data.operatorId) return fail('Not your conversation.')
  const body = str(params.body, 4000)
  if (!body) return fail('Message is empty.')
  const profile = await getProfile(tools, userId)
  const res = await tools.create('app-messages', {
    applicationId: app.recordId,
    senderId: userId,
    senderName: profile?.displayName ?? '',
    body,
    system: false,
    participants: [app.data.pilotId, app.data.operatorId],
  })
  if (res.success) await tools.update('applications', app.recordId, { lastMessageAt: new Date().toISOString() })
  return res
}

// ── Interview slots ────────────────────────────────────────────────────────

const createSlots: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const trip = await getRecord<Trip>(tools, 'trips', params.tripId)
  if (!trip) return fail('Trip not found.')
  if (trip.data.operatorId !== userId) return fail('Only the posting operator can add interview slots.')
  const input = Array.isArray(params.slots) ? params.slots.slice(0, 20) : []
  const durationMin = Math.max(15, Math.min(120, Number(params.durationMin) || 30))
  let count = 0
  for (const raw of input) {
    const t = Date.parse(str(raw, 40))
    if (!Number.isFinite(t) || t < Date.now() - 60_000) continue
    await tools.create('slots', {
      tripId: trip.recordId,
      operatorId: userId,
      startsAt: new Date(t).toISOString(),
      durationMin,
      status: 'open',
    } satisfies Slot as unknown as Record<string, unknown>)
    count++
  }
  if (count === 0) return fail('Add at least one future time.')
  return { success: true, data: { created: count } }
}

const deleteSlot: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const slot = await getRecord<Slot>(tools, 'slots', params.slotId)
  if (!slot) return fail('Slot not found.')
  if (slot.data.operatorId !== userId) return fail('Not your slot.')
  if (slot.data.status === 'booked') return fail('This slot is booked. Decline or reschedule the applicant first.')
  return tools.remove('slots', slot.recordId)
}

async function releaseBooking(tools: ActionTools, app: Envelope<Application>) {
  const slotId = app.data.interviewSlotId
  if (!slotId) return
  await tools.deleteWhere('bookings', { applicationId: app.recordId }, 10)
  await tools.update('slots', slotId, { status: 'open' })
  await tools.update('applications', app.recordId, { interviewSlotId: '', interviewAt: '' })
}

const bookSlot: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const app = await getRecord<Application>(tools, 'applications', params.applicationId)
  if (!app) return fail('Application not found.')
  if (app.data.pilotId !== userId) return fail('Only the applicant can book an interview.')
  if (['declined', 'withdrawn', 'hired'].includes(app.data.status)) return fail('This application is closed.')
  const slot = await getRecord<Slot>(tools, 'slots', params.slotId)
  if (!slot || slot.data.tripId !== app.data.tripId) return fail('That slot is not for this trip.')
  if (slot.data.status === 'booked') return fail('That slot was just taken. Pick another.')
  if (Date.parse(slot.data.startsAt) < Date.now()) return fail('That slot is in the past.')

  // The unique slotId on bookings is the race guard: a second concurrent
  // booking of the same slot is refused by the room.
  const booking = await tools.create('bookings', {
    slotId: slot.recordId,
    applicationId: app.recordId,
    tripId: app.data.tripId,
    startsAt: slot.data.startsAt,
    participants: [app.data.pilotId, app.data.operatorId],
  })
  if (!booking.success) return fail('That slot was just taken. Pick another.')

  if (app.data.interviewSlotId && app.data.interviewSlotId !== slot.recordId) {
    const previous = app.data.interviewSlotId
    await tools.deleteWhere('bookings', { slotId: previous }, 10)
    await tools.update('slots', previous, { status: 'open' })
  }
  await tools.update('slots', slot.recordId, { status: 'booked' })
  await tools.update('applications', app.recordId, {
    interviewSlotId: slot.recordId,
    interviewAt: slot.data.startsAt,
    status: 'interview',
  })
  const when = new Date(slot.data.startsAt).toUTCString().replace(':00 GMT', ' UTC')
  await postSystemMessage(tools, app, `Interview booked for ${when} (${slot.data.durationMin ?? 30} min).`)
  await notifyUser(tools, env, app.data.operatorId, {
    subject: `Interview booked: ${app.data.pilotName} · ${app.data.tripTitle}`,
    lines: [
      `${app.data.pilotName || 'An applicant'} booked an interview for ${app.data.tripTitle}.`,
      `When: ${when} (${slot.data.durationMin ?? 30} min).`,
    ],
    cta: { label: 'Open conversation', path: `/applications/${app.recordId}` },
  })
  return { success: true, data: { recordId: slot.recordId } }
}

export const actions: Record<string, ActionHandler<Env>> = {
  draftTripDetails,
  createTrip,
  applyToTrip,
  setApplicationStatus,
  sendMessage,
  createSlots,
  deleteSlot,
  bookSlot,
}
