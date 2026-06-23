import { test, expect, type Page } from '@playwright/test'

/**
 * Onboarding gate. The (app) layout redirects any user whose
 * `onboarding_completed` is false to /onboarding, so a half-set-up account can
 * never reach the real app. This is the sign-up → onboarding half of the
 * critical journey (completing onboarding mutates the flag, so we assert the
 * gate rather than flipping it, keeping the test repeatable).
 *
 * Helpers inlined per-spec (a shared local .ts import trips a Playwright/Node-23
 * loader bug).
 */
const onboardingUser = {
  email: process.env.E2E_ONBOARDING_EMAIL,
  password: process.env.E2E_ONBOARDING_PASSWORD,
}
const member = { email: process.env.E2E_MEMBER_EMAIL, password: process.env.E2E_MEMBER_PASSWORD }
const hasOnboarding = !!(onboardingUser.email && onboardingUser.password)
const hasMember = !!(member.email && member.password)

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
}

test.describe('Critical path — onboarding gate', () => {
  test.skip(
    !hasOnboarding,
    'Set E2E_ONBOARDING_EMAIL / E2E_ONBOARDING_PASSWORD to a user with onboarding_completed=false',
  )

  test('an account that has not finished onboarding is forced into /onboarding', async ({ page }) => {
    await login(page, onboardingUser.email!, onboardingUser.password!)
    await page.goto('/dashboard')
    await expect(page, 'incomplete user must be sent to onboarding').toHaveURL(/\/onboarding/)
  })
})

test.describe('Critical path — onboarded member reaches the app', () => {
  test.skip(!hasMember, 'Set E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD to run')

  test('an onboarded member lands on the dashboard, not onboarding', async ({ page }) => {
    await login(page, member.email!, member.password!)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
