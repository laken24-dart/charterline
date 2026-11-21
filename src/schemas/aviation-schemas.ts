/**
 * Charterline collections.
 *
 * Access model (enforced in the RecordRoom DO, never in the UI):
 *
 *  - profiles      Signed-in members read every profile (a pilot's public
 *                  résumé / an operator's company card). Each user writes only
 *                  their own row; `accountType` is immutable, so a crew member
 *                  cannot turn into an operator after the fact.
 *  - trips         Public read (the board works signed out). No client may
 *                  create one: `createTrip` checks the caller is an operator.
 *                  The posting operator may edit a few fields or delete it.
 *  - documents     Certificate sidecars for files in the pilot's PRIVATE R2
 *                  folder. Readable by the pilot and by the users in
 *                  `sharedWith`, which only the `applyToTrip` action writes
 *                  (it adds the hiring operator). The bytes themselves are
 *                  served by /api/documents/:id/file, which applies the
 *                  same rule. The app owner gets no extra access.
 *  - applications, messages, bookings
 *                  Readable only by the two participants (pilot + hiring
 *                  operator). Written only by server actions that check who
 *                  the caller is.
 *  - slots         Interview availability. Members read (times only; a booked
 *                  slot carries no pilot identity). Written only by actions.
 */

import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

const NONE: RolePermissions = { read: false, create: false, update: false, delete: false }
const READ_ONLY: RolePermissions = { read: true, create: false, update: false, delete: false }
/** Participants read; nobody writes from the client. */
const PARTICIPANTS_ONLY: RolePermissions = {
  read: 'collaborator',
  create: false,
  update: false,
  delete: false,
}

export const ACCOUNT_TYPES = ['operator', 'crew'] as const
export const CERTIFICATES = ['ATP', 'Commercial', 'Private'] as const
export const SEATS = ['PIC', 'SIC', 'Either'] as const
export const TRIP_STATUSES = ['open', 'filled', 'closed'] as const
export const APPLICATION_STATUSES = [
  'submitted',
  'shortlisted',
  'interview',
  'hired',
  'declined',
  'withdrawn',
] as const
export const DOCUMENT_KINDS = [
  'Pilot certificate',
  'Medical certificate',
  'Type rating',
  'Logbook summary',
  'Résumé',
  'Passport',
  'Other',
] as const

export const profilesSchema: CollectionSchema = {
  name: 'profiles',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    {
      name: 'accountType',
      storage: 'text',
      interpretation: { kind: 'select', options: [...ACCOUNT_TYPES] },
      required: true,
      immutable: true,
    },
    { name: 'displayName', storage: 'text', interpretation: 'plain', required: true },
    { name: 'company', storage: 'text', interpretation: 'plain' },
    { name: 'homeBase', storage: 'text', interpretation: 'plain' },
    {
      name: 'certificate',
      storage: 'text',
      interpretation: { kind: 'select', options: ['', ...CERTIFICATES] },
    },
    { name: 'totalHours', storage: 'number', interpretation: 'plain' },
    { name: 'typeRatings', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'bio', storage: 'text', interpretation: 'plain' },
  ],
  uniqueOn: ['userId'],
  ownerField: 'userId',
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: { read: true, create: true, update: 'own', delete: false },
    admin: { read: true, create: true, update: 'own', delete: false },
  },
}

export const tripsSchema: CollectionSchema = {
  name: 'trips',
  columns: [
    { name: 'operatorId', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'company', storage: 'text', interpretation: 'plain' },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'origin', storage: 'text', interpretation: 'plain', required: true },
    { name: 'originName', storage: 'text', interpretation: 'plain' },
    { name: 'originLat', storage: 'number', interpretation: 'plain' },
    { name: 'originLng', storage: 'number', interpretation: 'plain' },
    { name: 'destination', storage: 'text', interpretation: 'plain', required: true },
    { name: 'destinationName', storage: 'text', interpretation: 'plain' },
    { name: 'destinationLat', storage: 'number', interpretation: 'plain' },
    { name: 'destinationLng', storage: 'number', interpretation: 'plain' },
    { name: 'aircraft', storage: 'text', interpretation: 'plain', required: true },
    { name: 'typeRating', storage: 'text', interpretation: 'plain', required: true },
    { name: 'seat', storage: 'text', interpretation: { kind: 'select', options: [...SEATS] } },
    { name: 'startDate', storage: 'text', interpretation: { kind: 'date' } },
    { name: 'endDate', storage: 'text', interpretation: { kind: 'date' } },
    { name: 'dayRate', storage: 'number', interpretation: 'plain' },
    { name: 'minHours', storage: 'number', interpretation: 'plain' },
    { name: 'notes', storage: 'text', interpretation: 'plain' },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: [...TRIP_STATUSES] },
      default: 'open',
    },
  ],
  ownerField: 'operatorId',
  permissions: {
    '*': READ_ONLY,
    viewer: READ_ONLY,
    member: {
      read: true,
      create: false,
      update: 'own',
      delete: 'own',
      writableFields: ['status', 'notes', 'dayRate'],
    },
    admin: {
      read: true,
      create: false,
      update: 'own',
      delete: true,
      writableFields: ['status', 'notes', 'dayRate'],
    },
  },
}

export const documentsSchema: CollectionSchema = {
  name: 'documents',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    {
      name: 'kind',
      storage: 'text',
      interpretation: { kind: 'select', options: [...DOCUMENT_KINDS] },
      required: true,
    },
    { name: 'label', storage: 'text', interpretation: 'plain' },
    { name: 'fileKey', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'fileName', storage: 'text', interpretation: 'plain' },
    { name: 'mimeType', storage: 'text', interpretation: 'plain' },
    { name: 'size', storage: 'number', interpretation: 'plain' },
    { name: 'expiresOn', storage: 'text', interpretation: { kind: 'date' } },
    /** User ids allowed to read this document. Written only by server actions. */
    { name: 'sharedWith', storage: 'text', interpretation: { kind: 'json' }, default: [] },
  ],
  ownerField: 'ownerId',
  collaboratorsField: 'sharedWith',
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: {
      read: 'collaborator',
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['kind', 'label', 'fileKey', 'fileName', 'mimeType', 'size', 'expiresOn'],
    },
    // Owning the app grants nothing extra here: applicant documents stay
    // between the pilot and the operators they applied to.
    admin: {
      read: 'collaborator',
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['kind', 'label', 'fileKey', 'fileName', 'mimeType', 'size', 'expiresOn'],
    },
  },
}

export const applicationsSchema: CollectionSchema = {
  name: 'applications',
  columns: [
    { name: 'tripId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'pilotId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'operatorId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'tripTitle', storage: 'text', interpretation: 'plain' },
    { name: 'route', storage: 'text', interpretation: 'plain' },
    { name: 'pilotName', storage: 'text', interpretation: 'plain' },
    { name: 'company', storage: 'text', interpretation: 'plain' },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: [...APPLICATION_STATUSES] },
      default: 'submitted',
    },
    { name: 'note', storage: 'text', interpretation: 'plain' },
    { name: 'documentIds', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'participants', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'interviewSlotId', storage: 'text', interpretation: 'plain' },
    { name: 'interviewAt', storage: 'text', interpretation: 'plain' },
    { name: 'lastMessageAt', storage: 'text', interpretation: 'plain' },
  ],
  uniqueOn: ['tripId', 'pilotId'],
  collaboratorsField: 'participants',
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: PARTICIPANTS_ONLY,
    admin: PARTICIPANTS_ONLY,
  },
}

export const messagesSchema: CollectionSchema = {
  name: 'app-messages',
  columns: [
    { name: 'applicationId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'senderId', storage: 'text', interpretation: 'plain' },
    { name: 'senderName', storage: 'text', interpretation: 'plain' },
    { name: 'body', storage: 'text', interpretation: 'plain', required: true },
    { name: 'system', storage: 'number', interpretation: { kind: 'boolean' } },
    { name: 'participants', storage: 'text', interpretation: { kind: 'json' } },
  ],
  collaboratorsField: 'participants',
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: PARTICIPANTS_ONLY,
    admin: PARTICIPANTS_ONLY,
  },
}

export const slotsSchema: CollectionSchema = {
  name: 'slots',
  columns: [
    { name: 'tripId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'operatorId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'startsAt', storage: 'text', interpretation: 'plain', required: true },
    { name: 'durationMin', storage: 'number', interpretation: 'plain' },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: ['open', 'booked'] },
      default: 'open',
    },
  ],
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: READ_ONLY,
    admin: READ_ONLY,
  },
}

/** One row per booked slot; `uniqueOn` makes a double booking impossible. */
export const bookingsSchema: CollectionSchema = {
  name: 'bookings',
  columns: [
    { name: 'slotId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'applicationId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'tripId', storage: 'text', interpretation: 'plain' },
    { name: 'startsAt', storage: 'text', interpretation: 'plain' },
    { name: 'participants', storage: 'text', interpretation: { kind: 'json' } },
  ],
  uniqueOn: ['slotId'],
  collaboratorsField: 'participants',
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: PARTICIPANTS_ONLY,
    admin: PARTICIPANTS_ONLY,
  },
}

// ── Row types shared by worker and client ───────────────────────────────────

export type AccountType = (typeof ACCOUNT_TYPES)[number]
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export interface Profile {
  userId?: string
  accountType: AccountType
  displayName: string
  company?: string
  homeBase?: string
  certificate?: string
  totalHours?: number
  typeRatings?: string[]
  bio?: string
}

export interface Trip {
  operatorId: string
  company?: string
  title: string
  origin: string
  originName?: string
  originLat?: number
  originLng?: number
  destination: string
  destinationName?: string
  destinationLat?: number
  destinationLng?: number
  aircraft: string
  typeRating: string
  seat?: (typeof SEATS)[number]
  startDate?: string
  endDate?: string
  dayRate?: number
  minHours?: number
  notes?: string
  status?: (typeof TRIP_STATUSES)[number]
}

export interface DocumentRow {
  ownerId?: string
  kind: (typeof DOCUMENT_KINDS)[number]
  label?: string
  fileKey: string
  fileName?: string
  mimeType?: string
  size?: number
  expiresOn?: string
  sharedWith?: string[]
}

export interface Application {
  tripId: string
  pilotId: string
  operatorId: string
  tripTitle?: string
  route?: string
  pilotName?: string
  company?: string
  status: ApplicationStatus
  note?: string
  documentIds?: string[]
  participants?: string[]
  interviewSlotId?: string
  interviewAt?: string
  lastMessageAt?: string
}

export interface AppMessage {
  applicationId: string
  senderId?: string
  senderName?: string
  body: string
  system?: boolean
  participants?: string[]
}

export interface Slot {
  tripId: string
  operatorId: string
  startsAt: string
  durationMin?: number
  status?: 'open' | 'booked'
}

export interface Booking {
  slotId: string
  applicationId: string
  tripId?: string
  startsAt?: string
  participants?: string[]
}
