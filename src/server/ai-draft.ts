/**
 * "Draft with AI" for the post-a-trip form, through the DeepSpace
 * `anthropic/chat-completion` integration (owner-billed).
 *
 * Operator-only, and every input is clipped and validated against the airport
 * list before it reaches the prompt, so the action cannot be used as a free
 * general-purpose LLM proxy on the owner's credits.
 */

import type { ActionHandler, ActionResult } from 'deepspace/worker'
import type { Env } from '../../worker'
import type { Profile } from '../schemas/aviation-schemas'
import { SEATS } from '../schemas/aviation-schemas'
import { findAirport } from '../lib/airports'

const MODEL = 'claude-haiku-5-5'

interface AnthropicMessage {
  content?: Array<{ type: string; text?: string }>
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const SYSTEM = `You write contract-trip postings for Charterline, a job board where private-aviation operators hire contract pilots.
Write the "Details" section of one posting from the facts given. Rules:
- 90 to 160 words, plain text, no markdown headings, no bullet symbols other than "- ".
- Start with one sentence summarising the trip. Then short lines covering: expected legs/flow, duty expectations, what the pilot should have current (type rating, medical, recency), and logistics a contract pilot cares about (per diem, hotels, positioning) phrased as "to be confirmed" unless the operator's notes state them.
- Never invent specific numbers, regulations (Part 91/135), tail numbers, or names that are not in the facts.
- Professional, concise, written by the operator to pilots.`

export const draftTripDetails: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const profileRes = await tools.query('profiles', { where: { userId }, limit: 1 })
  const profile = profileRes.success
    ? (profileRes.data as unknown as { records: { data: Profile }[] }).records[0]?.data
    : undefined
  if (profile?.accountType !== 'operator') return { success: false, error: 'Only operator accounts can draft trips.' }

  const origin = findAirport(clip(params.origin, 4))
  const destination = findAirport(clip(params.destination, 4))
  if (!origin || !destination) return { success: false, error: 'Pick an origin and destination first.' }

  const seat = (SEATS as readonly string[]).includes(clip(params.seat, 10)) ? clip(params.seat, 10) : 'Either'
  const facts = [
    `Operator: ${profile.company || profile.displayName}`,
    `Trip title: ${clip(params.title, 120) || '(none yet)'}`,
    `Route: ${origin.icao} (${origin.name}, ${origin.city}) to ${destination.icao} (${destination.name}, ${destination.city})`,
    `Aircraft: ${clip(params.aircraft, 80) || '(not specified)'}`,
    `Required type rating: ${clip(params.typeRating, 80) || '(not specified)'}`,
    `Seat: ${seat}`,
    `Dates: ${clip(params.startDate, 10)} to ${clip(params.endDate, 10)}`,
    `Day rate: ${Number(params.dayRate) > 0 ? `$${Math.round(Number(params.dayRate))}` : '(not specified)'}`,
    `Minimum total time: ${Number(params.minHours) > 0 ? `${Math.round(Number(params.minHours))} hrs` : 'none stated'}`,
    `Operator's own notes (may be empty, use them as the source of truth): ${clip(params.notes, 1500) || '(none)'}`,
  ].join('\n')

  const res = await tools.integration<AnthropicMessage>('anthropic/chat-completion', {
    model: MODEL,
    max_tokens: 600,
    temperature: 0.5,
    system: SYSTEM,
    messages: [{ role: 'user', content: facts }],
  })
  if (!res.success) return { success: false, error: res.error || 'The AI draft failed. Try again.' }

  // Tolerate both the direct Messages shape and a `{ response }` wrapper.
  const raw = res.data as unknown as AnthropicMessage & { response?: AnthropicMessage }
  const message = raw?.response ?? raw
  const text = (message?.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) return { success: false, error: 'The AI returned an empty draft. Try again.' }
  return { success: true, data: { text: text.slice(0, 2000) } } satisfies ActionResult<{ text: string }>
}
