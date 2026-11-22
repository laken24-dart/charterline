/**
 * One-time setup of the two reviewer demo accounts on the deployed app:
 *   demo-operator@deepspace.test — operator profile + one demo trip with interview slots
 *   demo-pilot@deepspace.test    — crew profile with ratings + two sample certificates
 *
 *   npx playwright test --config scripts/seed.config.ts scripts/setup-demo-accounts.spec.ts
 *
 * Safe to re-run: each account is only set up the first time (its account type
 * is permanent once created).
 */
import { test, expect } from 'deepspace/testing'

function day(offset: number) {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
}

test('set up demo operator', async ({ users }) => {
  const [op] = await users(['Demo Operator'])
  const p = op.page
  await p.goto('/profile')
  const role = p.getByTestId('role-operator')
  await expect(role).toBeVisible({ timeout: 30_000 })
  if (await role.isDisabled()) {
    console.log('demo operator already set up')
    return
  }
  await role.click()
  await p.getByTestId('profile-name').fill('Demo Operator')
  await p.getByTestId('profile-company').fill('Demo Charter Co')
  await p.locator('textarea').fill('Demo operator account for reviewers. Part 91/135 fleet of large-cabin jets.')
  await p.getByTestId('profile-save').click()
  await expect(p).toHaveURL(/\/post$/, { timeout: 20_000 })

  // A trip the reviewer owns, so applications from the demo pilot land here.
  await p.getByTestId('trip-title').fill('Reviewer demo — Teterboro to Aspen ski week')
  await p.getByTestId('trip-origin').selectOption('KTEB')
  await p.getByTestId('trip-destination').selectOption('KASE')
  await p.getByTestId('trip-aircraft').fill('Gulfstream G450')
  await p.getByTestId('trip-rating').selectOption('G-IV (Gulfstream IV/G450)')
  const dates = p.locator('input[type="date"]')
  await dates.nth(0).fill(day(14))
  await dates.nth(1).fill(day(18))
  await p.getByTestId('trip-rate').fill('1800')
  await p.getByTestId('trip-notes').fill(
    'Demo listing for reviewers. Family ski week, 4 nights in Aspen. Mountain airport experience preferred. Per diem and hotel provided.',
  )
  await p.getByTestId('publish-trip').click()
  await expect(p).toHaveURL(/\/trips\/[^/]+$/, { timeout: 20_000 })

  for (const offset of [3, 4]) {
    const slot = new Date(Date.now() + offset * 86_400_000)
    slot.setUTCHours(16, 0, 0, 0)
    const local = new Date(slot.getTime() - slot.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    await p.getByLabel('Slot start').fill(local)
    await p.getByRole('button', { name: 'Add slot' }).click()
    await expect(p.getByLabel('Remove slot')).toHaveCount(offset - 2, { timeout: 10_000 })
  }
  console.log(`demo trip: ${p.url()}`)
})

test('set up demo pilot', async ({ users }) => {
  const [pilot] = await users(['Demo Pilot'])
  const p = pilot.page
  await p.goto('/profile')
  const role = p.getByTestId('role-crew')
  await expect(role).toBeVisible({ timeout: 30_000 })
  if (await role.isDisabled()) {
    console.log('demo pilot already set up')
    return
  }
  await role.click()
  await p.getByTestId('profile-name').fill('Demo Pilot')
  await p.locator('label:has-text("Home base") select').selectOption('KTEB')
  await p.locator('label:has-text("Highest certificate") select').selectOption('ATP')
  await p.locator('label:has-text("Total time") input').fill('6200')
  for (const code of ['G-IV', 'GVI', 'CL-30']) {
    await p.locator('button', { has: p.locator('span.font-code', { hasText: new RegExp(`^${code}$`) }) }).click()
  }
  await p.locator('textarea').fill('Demo pilot account for reviewers. ATP, 6,200 hrs, current on the G450 and G650.')
  await p.getByTestId('profile-save').click()
  await expect(p).toHaveURL(/\/documents$/, { timeout: 20_000 })

  const docs = [
    { name: 'demo-atp-certificate.pdf', kind: 'Pilot certificate', label: 'ATP certificate (demo)' },
    { name: 'demo-first-class-medical.pdf', kind: 'Medical certificate', label: 'First-class medical (demo)' },
  ]
  for (const d of docs) {
    await p.getByTestId('doc-file').setInputFiles({
      name: d.name,
      mimeType: 'application/pdf',
      buffer: Buffer.from(`%PDF-1.4\n% Charterline demo document: ${d.label}. Not a real certificate.\n`),
    })
    await p.locator('label:has-text("Type") select').selectOption(d.kind)
    await p.locator('label:has-text("Label") input').fill(d.label)
    await p.getByTestId('doc-save').click()
    await expect(p.getByText(d.label).first()).toBeVisible({ timeout: 20_000 })
  }
  console.log('demo pilot ready')
})

test('verify demo trip and slots', async ({ users }) => {
  const [op] = await users(['Demo Operator'])
  const p = op.page
  await p.goto('/dashboard')
  const link = p.getByText('Reviewer demo — Teterboro to Aspen ski week').first()
  await expect(link).toBeVisible({ timeout: 30_000 })
  await link.click()
  await expect(p).toHaveURL(/\/trips\/[^/]+$/, { timeout: 20_000 })
  await expect(p.getByLabel('Remove slot')).toHaveCount(2, { timeout: 20_000 })
  console.log(`demo trip OK with 2 slots: ${p.url()}`)
})
