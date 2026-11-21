/**
 * The whole hiring loop across three real accounts:
 *   Operator posts a trip and an interview slot →
 *   Pilot uploads a certificate, applies, books the slot, messages →
 *   Operator sees it live and can open the certificate →
 *   Outsider (a third signed-in user) sees neither the application nor the file.
 *
 * Needs three named pool accounts (created once):
 *   npx deepspace test accounts create --email cl-operator@deepspace.test --name "CL Operator" --password-stdin
 *   npx deepspace test accounts create --email cl-pilot@deepspace.test --name "CL Pilot" --password-stdin
 *   npx deepspace test accounts create --email cl-outsider@deepspace.test --name "CL Outsider" --password-stdin
 * Account types are permanent, so the spec reuses profiles on later runs.
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const NAMES = ['CL Operator', 'CL Pilot', 'CL Outsider']
const available = new Set(loadAllTestAccounts().map((a) => a.name))
test.skip(
  !NAMES.every((n) => available.has(n)),
  `Needs test accounts named ${NAMES.join(', ')} (see the header of this file).`,
)

async function ensureProfile(page: Page, role: 'operator' | 'crew', name: string) {
  await page.goto('/profile')
  const button = page.getByTestId(`role-${role}`)
  await expect(button).toBeVisible({ timeout: 20_000 })
  if (await button.isDisabled()) return // profile already exists from an earlier run
  await button.click()
  await page.getByTestId('profile-name').fill(name)
  if (role === 'operator') await page.getByTestId('profile-company').fill('Test Charter Co')
  await page.getByTestId('profile-save').click()
  await expect(page).not.toHaveURL(/\/profile$/, { timeout: 15_000 })
}

test('operator ↔ pilot hiring loop with private documents', async ({ users }) => {
  test.setTimeout(180_000)
  const [operator, pilot, outsider] = await users(NAMES)
  await ensureProfile(operator.page, 'operator', 'Olivia Operator')
  await ensureProfile(pilot.page, 'crew', 'Pat Pilot')
  await ensureProfile(outsider.page, 'operator', 'Otto Outsider')

  // Operator posts a trip.
  const title = `E2E ${Date.now()}`
  const op = operator.page
  await op.goto('/post')
  await op.getByTestId('trip-title').fill(title)
  await op.getByTestId('trip-origin').selectOption('KTEB')
  await op.getByTestId('trip-destination').selectOption('KASE')
  await op.getByTestId('trip-aircraft').fill('Gulfstream G450')
  await op.getByTestId('trip-rating').selectOption({ index: 16 })
  await op.getByTestId('trip-rate').fill('1800')
  await op.getByTestId('publish-trip').click()
  await expect(op).toHaveURL(/\/trips\/[^/]+$/, { timeout: 15_000 })
  const tripId = op.url().split('/trips/')[1]

  // …and publishes an interview slot two days out.
  const slot = new Date(Date.now() + 2 * 86_400_000)
  slot.setMinutes(0, 0, 0)
  const local = new Date(slot.getTime() - slot.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  await op.getByLabel('Slot start').fill(local)
  await op.getByRole('button', { name: 'Add slot' }).click()
  await expect(op.getByText('No slots yet.')).toHaveCount(0, { timeout: 10_000 })

  // The trip appears on the pilot's live board.
  const pp = pilot.page
  await pp.goto('/home')
  await expect(pp.getByTestId('trip-list').getByText(title)).toBeVisible({ timeout: 15_000 })

  // Pilot uploads a certificate.
  await pp.goto('/documents')
  await pp.getByTestId('doc-file').setInputFiles({
    name: 'atp-certificate.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% Charterline e2e test certificate\n'),
  })
  await pp.getByTestId('doc-save').click()
  await expect(pp.getByText('atp-certificate.pdf').first()).toBeVisible({ timeout: 20_000 })

  // Pilot applies, attaching it.
  await pp.goto(`/trips/${tripId}`)
  await pp.getByText('atp-certificate.pdf').first().click()
  await pp.getByTestId('submit-application').click()
  await expect(pp).toHaveURL(/\/applications\/[^/]+$/, { timeout: 15_000 })
  const appUrl = new URL(pp.url()).pathname
  const docId = await pp.getByTestId('open-document').first().getAttribute('data-doc-id')
  expect(docId).toBeTruthy()

  // Pilot books the slot and sends a message.
  await pp.getByTestId('book-slot').first().click()
  await expect(pp.getByText(/Interview booked for/)).toBeVisible({ timeout: 15_000 })
  await pp.getByTestId('message-input').fill('Current on the G-IV, available all week.')
  await pp.keyboard.press('Enter')

  // Operator sees the applicant, the booking and the message in real time.
  await op.goto(appUrl)
  await expect(op.getByText('Current on the G-IV, available all week.')).toBeVisible({ timeout: 15_000 })
  await expect(op.getByText(/Interview booked for/)).toBeVisible()
  const popup = op.waitForEvent('popup')
  await op.getByTestId('open-document').first().click()
  await expect((await popup).url()).toMatch(/^blob:/)

  // The outsider can see neither the application nor the certificate.
  const xp = outsider.page
  await xp.goto(appUrl)
  await expect(xp.getByText('Application not found')).toBeVisible({ timeout: 15_000 })
  await xp.goto(`/trips/${tripId}`)
  await expect(xp.getByText('Applicants')).toHaveCount(0)
  // With the outsider's own valid token, the file route still refuses.
  const statusAs = (page: Page) =>
    page.evaluate(async (id) => {
      const get = (window as unknown as { __getAuthToken: () => Promise<string | null> }).__getAuthToken
      const res = await fetch(`/api/documents/${id}/file`, { headers: { Authorization: `Bearer ${await get()}` } })
      return res.status
    }, docId)
  expect(await statusAs(xp)).toBe(404)
  expect(await statusAs(op)).toBe(200)
  expect(await statusAs(pp)).toBe(200)
})
