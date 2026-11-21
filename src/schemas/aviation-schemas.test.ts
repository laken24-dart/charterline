import { describe, expect, it } from 'vitest'
import { canCreate, canRead, lintSchemas } from 'deepspace/worker'
import { schemas } from '../schemas'
import {
  applicationsSchema,
  bookingsSchema,
  documentsSchema,
  messagesSchema,
  tripsSchema,
} from './aviation-schemas'

const PILOT = 'user_pilot'
const OPERATOR = 'user_operator'
const OTHER_OPERATOR = 'user_other'
const APP_OWNER = 'user_owner'

describe('Charterline schemas', () => {
  it('pass the SDK schema lint', () => {
    expect(lintSchemas(schemas)).toEqual([])
  })

  it('documents are readable only by the pilot and operators they were shared with', () => {
    const doc = { data: { ownerId: PILOT, sharedWith: [OPERATOR] }, createdBy: PILOT }
    expect(canRead(documentsSchema, 'member', doc, PILOT)).toBe(true)
    expect(canRead(documentsSchema, 'member', doc, OPERATOR)).toBe(true)
    expect(canRead(documentsSchema, 'member', doc, OTHER_OPERATOR)).toBe(false)
    // Owning the app does not unlock applicant documents.
    expect(canRead(documentsSchema, 'admin', doc, APP_OWNER)).toBe(false)
    expect(canRead(documentsSchema, 'viewer', doc, 'anon-1')).toBe(false)
  })

  it('a pilot cannot share a document by writing sharedWith', () => {
    const writable = documentsSchema.permissions.member.writableFields ?? []
    expect(writable).not.toContain('sharedWith')
    expect(writable).not.toContain('ownerId')
  })

  it.each([
    ['applications', applicationsSchema],
    ['messages', messagesSchema],
    ['bookings', bookingsSchema],
  ])('%s are participant-only and server-written', (_, schema) => {
    const row = { data: { participants: [PILOT, OPERATOR] }, createdBy: PILOT }
    expect(canRead(schema, 'member', row, PILOT)).toBe(true)
    expect(canRead(schema, 'member', row, OPERATOR)).toBe(true)
    expect(canRead(schema, 'member', row, OTHER_OPERATOR)).toBe(false)
    expect(canRead(schema, 'admin', row, APP_OWNER)).toBe(false)
    expect(canCreate(schema, 'member')).toBe(false)
  })

  it('trips are public to read but only created through the createTrip action', () => {
    const trip = { data: { operatorId: OPERATOR, status: 'open' }, createdBy: OPERATOR }
    expect(canRead(tripsSchema, '*', trip, 'anon-1')).toBe(true)
    expect(canCreate(tripsSchema, 'member')).toBe(false)
    expect(canCreate(tripsSchema, 'admin')).toBe(false)
  })
})
