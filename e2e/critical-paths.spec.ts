import { test, expect } from '@playwright/test'

/**
 * Critical-path journeys. These need a seeded TEST Supabase project with known
 * users (see e2e/README.md). They are skipped automatically until the required
 * env vars are present, so `npm run test:e2e` stays green out of the box.
 *
 * Required env:
 *   E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD    — a `member` role test user
 *   E2E_ADMIN_EMAIL  / E2E_ADMIN_PASSWORD     — a `super_admin` test user
 */
const hasMember = !!(process.env.E2E_MEMBER_EMAIL && process.env.E2E_MEMBER_PASSWORD)
const hasAdmin = !!(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD)

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

test.describe('Critical path — permission enforcement', () => {
  test.skip(!hasMember, 'Set E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD to run')

  test('a member cannot reach admin finance', async ({ page }) => {
    await login(page, process.env.E2E_MEMBER_EMAIL!, process.env.E2E_MEMBER_PASSWORD!)
    await page.goto('/admin/finance')
    // Member must be bounced (redirect away or shown a not-authorized state) —
    // they must NOT see the finance dashboard heading.
    await expect(page).not.toHaveURL(/\/admin\/finance$/)
  })
})

test.describe('Critical path — giving', () => {
  test.skip(!hasMember, 'Set E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD to run')

  test('a member can open their giving history', async ({ page }) => {
    await login(page, process.env.E2E_MEMBER_EMAIL!, process.env.E2E_MEMBER_PASSWORD!)
    await page.goto('/finance/my-giving')
    await expect(page).toHaveURL(/my-giving/)
  })
})

test.describe('Critical path — admin records a donation', () => {
  test.skip(!hasAdmin, 'Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run')

  test('admin can open the new-donation form', async ({ page }) => {
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
    await page.goto('/admin/finance/donations/new')
    await expect(page).toHaveURL(/donations\/new/)
    // TODO: fill amount/fund, submit, then assert it appears in /admin/finance/donations
    // (kept as a navigation smoke until a disposable test fund/account is seeded).
  })
})
