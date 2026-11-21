/**
 * Navigation Config
 *
 * `audience` filters by Charterline account type (from the user's profile),
 * not by RBAC room role. Omit it to show an item to everyone.
 */

import type { AccountType } from './schemas/aviation-schemas'

export interface NavItem {
  path: string
  label: string
  audience?: AccountType | 'signed-in'
  devOnly?: boolean
}

export const nav: NavItem[] = [
  { path: '/home', label: 'Board' },
  { path: '/dashboard', label: 'Dashboard', audience: 'signed-in' },
  { path: '/post', label: 'Post a trip', audience: 'operator' },
  { path: '/documents', label: 'Documents', audience: 'crew' },
  { path: '/profile', label: 'Profile', audience: 'signed-in' },
]
