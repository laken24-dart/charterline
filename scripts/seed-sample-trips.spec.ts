import { test, expect } from 'deepspace/testing'

function day(offset: number) {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
}

const NOTE = 'Sample listing posted to demonstrate Charterline. '
const TRIPS = [
  { title: 'Ski week — Aspen round trip', origin: 'KTEB', destination: 'KASE', aircraft: 'Gulfstream G450', rating: 'G-IV (Gulfstream IV/G450)', seat: 'PIC', start: 9, days: 5, rate: 1800, hours: 5000, notes: 'Family ski trip, 4 nights in Aspen. Part 91. Mountain airport experience preferred.' },
  { title: 'Cabo holiday charter', origin: 'KVNY', destination: 'MMSD', aircraft: 'Challenger 350', rating: 'CL-30 (Challenger 300/350)', seat: 'SIC', start: 12, days: 4, rate: 1250, hours: 2500, notes: 'Part 135 charter, international ops into Mexico. eAPIS handled by dispatch.' },
  { title: 'Transatlantic to Farnborough', origin: 'KTEB', destination: 'EGLF', aircraft: 'Gulfstream G650ER', rating: 'GVI (Gulfstream G650)', seat: 'PIC', start: 16, days: 6, rate: 2400, hours: 6000, notes: 'NAT HLA / RVSM current. Two crew plus one relief. Hotel and per diem provided.' },
  { title: 'Caribbean island hops', origin: 'KPBI', destination: 'TFFJ', aircraft: 'Pilatus PC-12 NGX', rating: 'PC-12 (Pilatus PC-12)', seat: 'PIC', start: 6, days: 7, rate: 950, hours: 1500, notes: 'St. Barths approach checkout required, or we arrange one. Week of short island legs.' },
  { title: 'Riviera shuttle week', origin: 'LFPB', destination: 'LFMN', aircraft: 'Falcon 7X', rating: 'DA-7X (Falcon 7X/8X)', seat: 'SIC', start: 20, days: 5, rate: 1600, hours: 3000, notes: 'EASA validation required. Daily Paris–Nice shuttles for a corporate client.' },
  { title: 'Sun Valley conference lift', origin: 'KSJC', destination: 'KSUN', aircraft: 'Citation Latitude', rating: 'CE-680 (Citation Sovereign/Latitude)', seat: 'PIC', start: 25, days: 3, rate: 1350, hours: 3000, notes: 'Short-field mountain ops into Friedman Memorial. Quick turn both ways.' },
  { title: 'Dubai to Geneva positioning', origin: 'OMDW', destination: 'LSGG', aircraft: 'Global 6000', rating: 'BD-700 (Global Express/5000/6000/7500)', seat: 'PIC', start: 14, days: 3, rate: 2200, hours: 5000, notes: 'Positioning flight plus one revenue leg. Middle East ops experience a plus.' },
  { title: 'Spring break to Nassau', origin: 'KOPF', destination: 'MYNN', aircraft: 'Phenom 300E', rating: 'EMB-505 (Phenom 300)', seat: 'Either', start: 4, days: 2, rate: 900, hours: 1200, notes: 'Quick out-and-back with a two-night stay. Single-pilot certified aircraft, but two crew requested.' },
  { title: 'Yellowstone family trip', origin: 'KDAL', destination: 'KJAC', aircraft: 'Challenger 605', rating: 'CL-65 (Challenger 600 series)', seat: 'SIC', start: 30, days: 6, rate: 1400, hours: 2500, notes: 'Jackson Hole arrival. Owner flies with family; Part 91.' },
  { title: 'Iceland adventure charter', origin: 'KBED', destination: 'BIKF', aircraft: 'Citation X', rating: 'CE-750 (Citation X)', seat: 'PIC', start: 35, days: 5, rate: 1700, hours: 4000, notes: 'North Atlantic crossing via Goose Bay. Winter ops experience required.' },
  { title: 'Hawaii holiday — Maui', origin: 'KOAK', destination: 'PHOG', aircraft: 'Gulfstream G550', rating: 'G-V (Gulfstream V/G550)', seat: 'SIC', start: 40, days: 8, rate: 1500, hours: 3000, notes: 'Over-water ETOPS-style planning. One week layover on Maui.' },
  { title: 'Sardinia summer preview', origin: 'EGGW', destination: 'LIEO', aircraft: 'Falcon 2000LXS', rating: 'DA-2000 (Falcon 2000)', seat: 'PIC', start: 45, days: 4, rate: 1550, hours: 3500, notes: 'Olbia slots secured. EASA licence or validation needed.' },
]

test('post sample trips', async ({ users, page: _page }) => {
  const [op] = await users(['CL Operator'])
  const p = op.page

  // Ensure an operator profile exists on this deployment.
  await p.goto('/profile')
  const roleButton = p.getByTestId('role-operator')
  await expect(roleButton).toBeVisible({ timeout: 30_000 })
  if (!(await roleButton.isDisabled())) {
    await roleButton.click()
    await p.getByTestId('profile-name').fill('Charterline Demo')
    await p.getByTestId('profile-company').fill('Charterline Sample Fleet')
    await p.getByTestId('profile-save').click()
    await expect(p).toHaveURL(/\/post$/, { timeout: 20_000 })
  }

  for (const t of TRIPS) {
    await p.goto('/post')
    await expect(p.getByTestId('trip-title')).toBeVisible({ timeout: 20_000 })
    await p.getByTestId('trip-title').fill(t.title)
    await p.getByTestId('trip-origin').selectOption(t.origin)
    await p.getByTestId('trip-destination').selectOption(t.destination)
    await p.getByTestId('trip-aircraft').fill(t.aircraft)
    await p.getByTestId('trip-rating').selectOption(t.rating)
    await p.locator('select').filter({ hasText: 'Either' }).selectOption(t.seat)
    const dates = p.locator('input[type="date"]')
    await dates.nth(0).fill(day(t.start))
    await dates.nth(1).fill(day(t.start + t.days - 1))
    await p.getByTestId('trip-rate').fill(String(t.rate))
    await p.locator('label:has-text("Min. total time") input').fill(String(t.hours))
    await p.locator('textarea').fill(NOTE + t.notes)
    await p.getByTestId('publish-trip').click()
    await expect(p).toHaveURL(/\/trips\/[^/]+$/, { timeout: 20_000 })
    console.log(`posted: ${t.title} → ${p.url()}`)
  }
})
