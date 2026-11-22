/**
 * UI wiring for the DeepSpace integrations, with the paid upstream calls
 * mocked at the network boundary so the run costs nothing:
 *   - anthropic/chat-completion → "Draft with AI" fills the trip details
 *   - openweathermap/current     → field weather panel on the trip page
 * (email/send runs server-side inside the actions and is covered by the
 * hiring loop in hiring.spec.ts, where a failed send never fails the action.)
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const OPERATOR = 'CL Operator'
test.skip(
  !loadAllTestAccounts().some((a) => a.name === OPERATOR),
  `Needs the "${OPERATOR}" test account (see tests/hiring.spec.ts).`,
)

async function ensureOperator(page: Page) {
  await page.goto('/profile')
  const button = page.getByTestId('role-operator')
  await expect(button).toBeVisible({ timeout: 20_000 })
  if (await button.isDisabled()) return
  await button.click()
  await page.getByTestId('profile-name').fill('Olivia Operator')
  await page.getByTestId('profile-company').fill('Test Charter Co')
  await page.getByTestId('profile-save').click()
  await expect(page).not.toHaveURL(/\/profile$/, { timeout: 15_000 })
}

test('AI draft fills trip details and trip page shows field weather', async ({ users }) => {
  test.setTimeout(90_000)
  const [operator] = await users([OPERATOR])
  const page = operator.page
  await ensureOperator(page)

  const DRAFT = 'Round trip Teterboro to Aspen for a family ski week. Type rating and medical must be current.'
  let draftBody: Record<string, unknown> | null = null
  await page.route('**/api/actions/draftTripDetails', async (route) => {
    draftBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { text: DRAFT } }) })
  })
  const weatherQueries: string[] = []
  await page.route('**/api/integrations/openweathermap/current', async (route) => {
    weatherQueries.push(String(route.request().postDataJSON()?.q))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { temp: 34.6, description: 'light snow', wind_speed: 9, wind_deg: 270, visibility: 8000, humidity: 80 },
      }),
    })
  })

  await page.goto('/post')
  const draft = page.getByTestId('draft-details')
  await expect(draft).toBeDisabled()
  await page.getByTestId('trip-title').fill(`Integrations ${Date.now()}`)
  await page.getByTestId('trip-origin').selectOption('KTEB')
  await page.getByTestId('trip-destination').selectOption('KASE')
  await page.getByTestId('trip-aircraft').fill('Gulfstream G450')
  await page.getByTestId('trip-rating').selectOption({ index: 16 })
  await page.getByTestId('trip-rate').fill('1800')
  await draft.click()
  await expect(page.getByTestId('trip-notes')).toHaveValue(DRAFT)
  expect(draftBody).toMatchObject({ origin: 'KTEB', destination: 'KASE', aircraft: 'Gulfstream G450' })

  await page.getByTestId('publish-trip').click()
  await expect(page).toHaveURL(/\/trips\/[^/]+$/, { timeout: 15_000 })
  await expect(page.getByText(DRAFT)).toBeVisible()
  const rows = page.getByTestId('airport-weather')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('35°F')
  await expect(rows.first()).toContainText('light snow')
  await expect(rows.first()).toContainText('W 9 mph')
  expect(weatherQueries).toEqual(expect.arrayContaining(['New York,NY,US', 'Aspen,CO,US']))
})
