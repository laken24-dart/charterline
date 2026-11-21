// Posts sample listings to a deployed app as a test operator account.
//   SEED_URL=https://charterline.app.space npx playwright test --config scripts/seed.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  testMatch: ['seed-sample-trips.spec.ts'],
  timeout: 600_000,
  reporter: 'line',
  use: { baseURL: process.env.SEED_URL ?? 'https://charterline.app.space' },
})
