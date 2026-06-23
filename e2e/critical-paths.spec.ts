import { test, expect, type Page } from '@playwright/test'

/**
 * Critical-path journeys that need a seeded TEST Supabase project with known
 * users (see e2e/README.md). They skip automatically until the required env
 * vars are present, so `npm run test:e2e` stays green out of the box.
 *
 * Helpers are inlined per-spec on purpose: importing a shared local .ts module
 * trips a Playwright/Node-23 loader bug, so each spec stays self-contained.
 */
const member = { email: process.env.E2E_MEMBER_EMAIL, password: process.env.E2E_MEMBER_PASSWORD }
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }
const hasMember = !!(member.email && member.password)
const hasAdmin = !!(admin.email && admin.password)

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
}

test.describe('Critical path — permission enforcement', () => {
  test.skip(!hasMember, 'Set E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD to run')

  test('a member is redirected away from super-admin-only pages', async ({ page }) => {
    await login(page, member.email!, member.password!)
    // requireRole('super_admin') / requirePermission(...) bounce to /dashboard.
    for (const path of ['/admin/permissions', '/admin/settings', '/admin/members']) {
      await page.goto(path)
      await expect(page, `member must not reach ${path}`).toHaveURL(/\/dashboard/)
    }
  })
})

test.describe('Critical path — admin can reach admin pages', () => {
  test.skip(!hasAdmin, 'Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run')

  test('a super_admin opens the admin pages a member was blocked from', async ({ page }) => {
    await login(page, admin.email!, admin.password!)
    await page.goto('/admin/permissions')
    await expect(page).toHaveURL(/\/admin\/permissions/)
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/admin\/settings/)
  })
})

/**
 * Finance is feature-flagged OFF (in development). The whole surface must be
 * unreachable for EVERYONE — including a super_admin — until the flag is on.
 * Middleware redirects the pages and 404s the API.
 */
test.describe('Critical path — finance is OFF (feature-flagged)', () => {
  test('the finance API returns 404 (blocked before auth)', async ({ page }) => {
    // The finance gate runs ahead of the auth check, so this 404s even
    // unauthenticated — no seeded user required.
    const res = await page.request.get('/api/finance/donations')
    expect(res.status()).toBe(404)
  })

  test('finance pages redirect away even for a super_admin', async ({ page }) => {
    test.skip(!hasAdmin, 'Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run')
    await login(page, admin.email!, admin.password!)

    await page.goto('/admin/finance')
    await expect(page, '/admin/finance must be blocked').not.toHaveURL(/\/admin\/finance/)

    await page.goto('/finance/my-giving')
    await expect(page, '/finance/my-giving must be blocked').not.toHaveURL(/my-giving/)
  })
})
