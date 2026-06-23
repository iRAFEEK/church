import { test, expect, type Page } from '@playwright/test'

/**
 * The two journeys not yet automated:
 *  1. Full sign-up → onboarding → dashboard (a brand-new account end to end).
 *  2. Two-church data isolation (a church B admin cannot read church A's data).
 *
 * Needs: E2E_CHURCH_ID (church to join), E2E_CHURCHB_* (a church B super_admin),
 * E2E_MEMBER_ID (a church A member, for the deep-link isolation probe).
 * The sign-up test creates an auth user named e2e-signup-*@e2e.test — sweep it
 * from the DB afterwards.
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  for (let i = 0; i < 3; i++) {
    await page.locator('button[type="submit"]').click().catch(() => {})
    try {
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 })
      return
    } catch { /* retry */ }
  }
  throw new Error('login failed')
}

/**
 * Note on the UI sign-up form: this project's Supabase has email confirmation
 * ENABLED with no custom SMTP, so /auth/v1/signup tries to send a confirmation
 * mail and is rate-limited (and rejects test domains like @example.com). A
 * brand-new user therefore cannot complete sign-up until Resend/SMTP is wired
 * into Supabase Auth (or confirmation is disabled) — a launch dependency, not a
 * code bug. So we test the part that follows sign-up — onboarding completion —
 * using a pre-confirmed user (created via the admin API; see e2e/README.md).
 */
test.describe('Journey — onboarding → dashboard (new account)', () => {
  const u = { email: process.env.E2E_NEWUSER_EMAIL, password: process.env.E2E_NEWUSER_PASSWORD }
  test.skip(!(u.email && u.password), 'Set E2E_NEWUSER_* to a confirmed user with onboarding_completed=false')

  test('a new (un-onboarded) account is gated into onboarding, completes it, and reaches the app', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, u.email!, u.password!)

    // Gate: an un-onboarded account cannot reach the app yet.
    await page.goto('/dashboard')
    await expect(page, 'un-onboarded user must be sent to onboarding').toHaveURL(/\/onboarding/, { timeout: 15_000 })

    // Complete onboarding (only Arabic first/last name are required).
    await page.locator('input[name="first_name_ar"]').fill('اختبار')
    await page.locator('input[name="last_name_ar"]').fill('جديد')
    await page.locator('button[type="submit"]').click()

    // Lands in the app (onboarding pushes to '/', which → /dashboard).
    await expect(page).toHaveURL(/\/dashboard|localhost:\d+\/$/, { timeout: 20_000 })
    // eslint-disable-next-line no-console
    console.log(`ONBOARDING complete → ${new URL(page.url()).pathname}`)
  })
})

test.describe('Journey — two-church data isolation', () => {
  const b = { email: process.env.E2E_CHURCHB_EMAIL, password: process.env.E2E_CHURCHB_PASSWORD }
  const graceMemberId = process.env.E2E_MEMBER_ID
  const graceGroupId = process.env.E2E_GROUP_ID
  test.skip(!(b.email && b.password), 'Set E2E_CHURCHB_*')

  test("a church B admin cannot read church A's data", async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, b.email!, b.password!)
    const graceEmail = /@gracechurch\.test/g

    // A) Church B's own member list must contain ZERO church A members.
    const list = await page.request.get('/admin/members')
    const listHtml = await list.text()
    const graceInList = (listHtml.match(graceEmail) || []).length
    // eslint-disable-next-line no-console
    console.log(`ISOLATION /admin/members → graceEmails=${graceInList} (expect 0)`)
    expect(graceInList, 'church B must not see church A members in its list').toBe(0)

    // B) Deep-linking a specific church A member must not expose their data.
    if (graceMemberId) {
      const detail = await page.request.get(`/admin/members/${graceMemberId}`)
      const detailHtml = await detail.text()
      const graceInDetail = (detailHtml.match(graceEmail) || []).length
      // eslint-disable-next-line no-console
      console.log(`ISOLATION /admin/members/[graceId] → graceEmails=${graceInDetail} (expect 0)`)
      expect(graceInDetail, "church B must not read a church A member's detail").toBe(0)
    }

    // C) Writing into church A (a gathering for church A's group) must not create
    //    anything church B could use to reach church A's data. Log the status; a
    //    2xx here would be a referential-integrity gap worth a follow-up.
    if (graceGroupId) {
      const w = await page.request.post('/api/gatherings', {
        data: { group_id: graceGroupId, scheduled_at: new Date().toISOString(), topic: '[E2E] xchurch' },
      })
      // eslint-disable-next-line no-console
      console.log(`ISOLATION cross-church write → ${w.status()} (ideally 4xx)`)
    }
  })
})
