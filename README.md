# Charterline

**Contract pilot jobs for private aviation.**

Operators post contract trips on a live world map. Type-rated pilots browse them, apply with their certificates, message the operator and book an interview slot, all in real time.

**Live app:** https://charterline.app.space

## Features

- **Live trip map.** Open contracts are drawn as routes on a world map. Anyone can browse them without an account.
- **Post a trip.** Operators pick a route, aircraft, required type rating, seat, dates and day rate. **Draft with AI** (Anthropic) writes the trip description.
- **Field weather.** Each trip page shows current conditions at both airports, from OpenWeatherMap.
- **Pilot profiles and documents.** Pilots record their certificate, total hours and type ratings, and upload certificates to attach to applications.
- **Apply, message, interview.** Each application has its own conversation thread. Operators publish interview slots, pilots book one, and either side can add it to Google Calendar.
- **Hire.** Operators hire a pilot from an application. Email notifications go out at each step of the hiring flow.
- **Private by default.** Only the pilot and the trip's operator can see an application and its documents.

## Stack

- [DeepSpace](https://deep.space) SDK on Cloudflare Workers, with Durable Objects for records, realtime sync, presence, cron and jobs
- React 19, React Router 7 (file-based routes via generouted), Vite 8
- Tailwind CSS 4, Base UI, lucide icons
- Leaflet and world-atlas / topojson for the map
- Hono for Worker HTTP routes
- Vitest for unit tests, Playwright for smoke, API and end-to-end tests

The integrations (email, Anthropic, OpenWeatherMap, Google Calendar) run through DeepSpace, so no third-party API keys are stored in this repo. Billing for each integration is configured in [src/integrations.ts](src/integrations.ts).

## Getting started

Requirements: Node 22.15+ (or 24 / 26) and npm 11.6+.

```bash
npm install
npx deepspace auth login    # sign in to DeepSpace
npm run dev                 # local dev server (Vite + Miniflare)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run deploy` | Deploy to `charterline.app.space` |
| `npm run validate` | Type-check and run unit tests |
| `npm run lint` | ESLint |
| `npm test` | Run the full DeepSpace test suite |
| `npm run test:smoke` / `test:api` / `test:e2e` | Run one test tier |
| `npm run test:unit` | Vitest unit tests |

## Project layout

```
src/
  pages/        File-based routes; (app)/(protected)/ requires sign-in
  components/   TripMap, HeroMap, Navigation, UI primitives
  schemas/      Collections: profiles, trips, documents, applications,
                app-messages, slots, bookings
  server/       Worker routes: actions, documents, realtime, AI draft, notifications
  ai/           In-app assistant: agent, tools, chat routes
  lib/          Airports, map projection, integration clients
worker.ts       Cloudflare Worker entry
scripts/        Sample data seeding and demo account setup
tests/          Playwright smoke, API, collaboration, hiring and integration specs
```

## Demo walkthrough

The landing page has a "Try the full flow" section with two demo accounts: an operator who owns a Teterboro to Aspen trip, and a G450-rated pilot. It also has a six-step tour that covers every integration. To recreate the demo accounts on a deployment, use [scripts/setup-demo-accounts.spec.ts](scripts/setup-demo-accounts.spec.ts). Demo passwords are not stored in this repo.
