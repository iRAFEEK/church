import { test, expect } from '@playwright/test'

/**
 * Runnable out of the box — no seeded data required.
 * Verifies the middleware auth gate and that public pages render. These cover
 * the single most security-relevant behavior: unauthenticated users cannot
 * reach the app and are redirected to /login.
 */

test.describe('Auth gating (middleware)', () => {
  test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated visit to admin finance redirects to /login', async ({ page }) => {
    await page.goto('/admin/finance')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders the email + password form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('public routes are reachable without auth', async ({ page }) => {
    for (const path of ['/login', '/signup', '/welcome']) {
      const res = await page.goto(path)
      expect(res?.status(), `${path} should not be an error`).toBeLessThan(400)
      await expect(page).not.toHaveURL(/\/login\?/) // not bounced (login itself is fine)
    }
  })
})
