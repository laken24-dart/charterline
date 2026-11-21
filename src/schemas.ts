/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import {
  applicationsSchema,
  bookingsSchema,
  documentsSchema,
  messagesSchema,
  profilesSchema,
  slotsSchema,
  tripsSchema,
} from './schemas/aviation-schemas'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  profilesSchema,
  tripsSchema,
  documentsSchema,
  applicationsSchema,
  messagesSchema,
  slotsSchema,
  bookingsSchema,
]
