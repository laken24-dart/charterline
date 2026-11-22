/**
 * Integration Billing Config
 *
 * Configure who pays for each integration's API calls.
 *
 * - 'developer': The app owner pays (default).
 * - 'user': The calling user pays.
 *
 * Every integration requires a signed-in caller. Set `anonymous: true` on a
 * 'developer' integration to let signed-out visitors call it too — the owner
 * then pays for anyone who can reach the app.
 *
 * Integrations not listed here default to 'developer' with sign-in required.
 *
 * IMPORTANT: any integration backed by per-user connected accounts (Google,
 * Composio) must be 'user' — the api-worker resolves the account from the
 * JWT subject. With 'developer' the app owner's JWT is forwarded, so every
 * signed-in user connects and acts on the app owner's account. Server code
 * that acts for a user in the background (e.g. a cron job) uses
 * `callComposio(env, ..., { asUser })` from 'deepspace/worker' instead.
 */

export const integrations: Record<
  string,
  { billing: 'developer' | 'user'; anonymous?: boolean }
> = {
  // Per-user OAuth: each pilot/operator connects their own Google Calendar
  // ("Add to Google Calendar" on applications/[id]).
  google: { billing: 'user' },
  composio: { billing: 'user' },
  // Owner-paid, signed-in callers only:
  // hiring-flow notifications (src/server/notify.ts)
  email: { billing: 'developer' },
  // "Draft with AI" on the post-a-trip form (src/server/ai-draft.ts)
  anthropic: { billing: 'developer' },
  // Field weather on trip pages (src/lib/integration-client.ts)
  openweathermap: { billing: 'developer' },
}
