import { test, expect } from '@playwright/test'

/**
 * Public visitor intake (the QR-code journey). A visitor opens
 * /join?church=<id>, fills the form, and lands on the success page — all with
 * no auth. This creates one visitor row per run (named "[E2E] Visitor" so it's
 * easy to clean up).
 */
const churchId = process.env.E2E_CHURCH_ID

test.describe('Critical path — public visitor intake (/join)', () => {
  test('a /join link with no church id is rejected', async ({ page }) => {
    // No church id → the page redirects to /login (no data required).
    await page.goto('/join')
    await expect(page).toHaveURL(/\/login/)
  })

  test('a visitor can submit the join form and reach the success page', async ({ page }) => {
    test.skip(!churchId, 'Set E2E_CHURCH_ID to a church id present in your test DB')

    await page.goto(`/join?church=${churchId}`)

    await page.locator('input[name="first_name"]').fill('[E2E]')
    await page.locator('input[name="last_name"]').fill('Visitor')

    // phone is enabled-but-optional in the default config; fill it when present.
    const phone = page.locator('input[name="phone"]')
    if (await phone.count()) await phone.fill('+201000000000')

    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/join\/success/, { timeout: 15_000 })
  })
})
