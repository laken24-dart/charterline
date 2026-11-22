/**
 * Browser-side DeepSpace integrations:
 *
 *  - openweathermap/current  — field weather at a trip's airports (owner-billed,
 *    signed-in callers only, cached per city for the session).
 *  - google/calendar-create-event — puts an interview or a hired trip on the
 *    signed-in user's own Google Calendar (user-billed; see src/integrations.ts).
 */

import { useEffect, useState } from 'react'
import { integration } from 'deepspace'

// ── Weather ────────────────────────────────────────────────────────────────

export interface Weather {
  temp: number
  feels_like?: number
  description: string
  icon?: string
  wind_speed?: number
  wind_deg?: number
  visibility?: number
  humidity?: number
}

const US_STATES = new Set(
  'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '),
)
const CA_PROVINCES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK'])
const COUNTRY_FIX: Record<string, string> = { UK: 'GB' }

/**
 * OpenWeatherMap's `q` is "city,state,country". Airport cities are stored as
 * "Aspen, CO" / "London, UK" / "Singapore", so expand the suffix it would
 * otherwise misread ("CO" is also Colombia).
 */
export function weatherQuery(city: string): string {
  const [place, region] = city.split(',').map((s) => s.trim())
  if (!region) return place
  if (US_STATES.has(region)) return `${place},${region},US`
  if (CA_PROVINCES.has(region)) return `${place},CA`
  return `${place},${COUNTRY_FIX[region] ?? region}`
}

const weatherCache = new Map<string, Promise<Weather | null>>()

function fetchWeather(city: string): Promise<Weather | null> {
  const q = weatherQuery(city)
  let p = weatherCache.get(q)
  if (!p) {
    p = integration
      .post<Weather>('openweathermap/current', { q, units: 'imperial' })
      .then((res) => (res.success && res.data && typeof res.data.temp === 'number' ? res.data : null))
      .catch(() => null)
    // A failure is not cached, so a later mount retries.
    p.then((w) => {
      if (!w) weatherCache.delete(q)
    })
    weatherCache.set(q, p)
  }
  return p
}

export function useWeather(city: string | undefined, enabled: boolean) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; data: Weather | null }>({
    status: 'idle',
    data: null,
  })
  useEffect(() => {
    if (!enabled || !city) return
    let live = true
    setState({ status: 'loading', data: null })
    fetchWeather(city).then((w) => {
      if (live) setState({ status: w ? 'ready' : 'error', data: w })
    })
    return () => {
      live = false
    }
  }, [city, enabled])
  return state
}

export function compass(deg: number | undefined): string {
  if (typeof deg !== 'number') return ''
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8]
}

// ── Google Calendar ────────────────────────────────────────────────────────

export interface CalendarEventInput {
  title: string
  start: string
  end?: string
  allDay?: boolean
  description?: string
  location?: string
}

export type CalendarResult =
  | { ok: true; link?: string }
  | { ok: false; needsConnect: true }
  | { ok: false; needsConnect?: false; error: string }

/**
 * Create the event, following the platform's success-shaped requiresOAuth
 * contract: without a connected Google account the call answers
 * `{ success: true, data: { requiresOAuth, authUrl } }`, so we open the consent
 * popup and let the user retry once it closes.
 */
export async function addToGoogleCalendar(event: CalendarEventInput): Promise<CalendarResult> {
  // Open the popup inside the click so blockers allow it; close it if unused.
  const popup = window.open('', 'google-auth', 'width=500,height=640')
  const result = await integration.post('google/calendar-create-event', {
    calendarId: 'primary',
    ...event,
  })
  if (!result.success) {
    popup?.close()
    if (result.error?.startsWith('Token refresh failed')) return { ok: false, needsConnect: true }
    return { ok: false, error: result.error || 'Could not add the event.' }
  }
  const payload = (result.data ?? result) as Record<string, unknown>
  if (payload?.requiresOAuth && typeof payload.authUrl === 'string') {
    if (popup) popup.location.href = payload.authUrl
    else window.open(payload.authUrl, 'google-auth', 'width=500,height=640')
    return { ok: false, needsConnect: true }
  }
  popup?.close()
  const link = typeof payload?.htmlLink === 'string' ? payload.htmlLink : undefined
  return { ok: true, link }
}

/** Google treats an all-day event's end date as exclusive: add a day. */
export function exclusiveEndDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
