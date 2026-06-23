import { test, expect, type Page } from '@playwright/test'

/**
 * Phase B — member feature MUTATIONS. Phase A proved what a member can reach;
 * this proves the core actions actually work end to end (auth + RLS + validation
 * + DB), driven through the real APIs with the logged-in session. Each action
 * cleans up after itself so the suite is repeatable.
 *
 * Needs: E2E_MEMBER_*, E2E_EVENT_ID, E2E_SLOT_ID.
 */
const member = { email: process.env.E2E_MEMBER_EMAIL, password: process.env.E2E_MEMBER_PASSWORD }
const eventId = process.env.E2E_EVENT_ID
const slotId = process.env.E2E_SLOT_ID

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

test.describe('Phase B — member actions', () => {
  test.skip(!(member.email && member.password), 'Set E2E_MEMBER_* to run')

  test('a member can RSVP, serve, pray, and say "I\'m praying"', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, member.email!, member.password!)
    const api = page.request
    const ok = (s: number) => s >= 200 && s < 300

    // 1) RSVP an event (body optional — falls back to profile). Clean slate first.
    if (eventId) {
      await api.delete(`/api/events/${eventId}/register`).catch(() => {})
      const r = await api.post(`/api/events/${eventId}/register`, { data: {} })
      // eslint-disable-next-line no-console
      console.log(`RSVP → ${r.status()}`)
      expect(ok(r.status()), `RSVP should succeed (${r.status()})`).toBeTruthy()
      await api.delete(`/api/events/${eventId}/register`).catch(() => {})
    }

    // 2) Serving signup (param-only) then withdraw.
    if (slotId) {
      await api.delete(`/api/serving/slots/${slotId}/signup`).catch(() => {})
      const r = await api.post(`/api/serving/slots/${slotId}/signup`)
      // eslint-disable-next-line no-console
      console.log(`SERVE signup → ${r.status()}`)
      expect(ok(r.status()), `serving signup should succeed (${r.status()})`).toBeTruthy()
      await api.delete(`/api/serving/slots/${slotId}/signup`).catch(() => {})
    }

    // 3) Submit a prayer request, then 4) say "I'm praying", then clean up.
    const pr = await api.post('/api/church-prayers', {
      data: { content: '[E2E] please pray', is_anonymous: false, is_private: false },
    })
    // eslint-disable-next-line no-console
    console.log(`PRAYER submit → ${pr.status()}`)
    expect(ok(pr.status()), `prayer submit should succeed (${pr.status()})`).toBeTruthy()

    const prayerId = (await pr.json().catch(() => ({})))?.data?.id ?? (await pr.json().catch(() => ({})))?.id
    if (prayerId) {
      const pray = await api.post(`/api/church-prayers/${prayerId}/pray`)
      // eslint-disable-next-line no-console
      console.log(`I'M PRAYING → ${pray.status()}`)
      expect(ok(pray.status()), `pray response should succeed (${pray.status()})`).toBeTruthy()
      await api.delete(`/api/church-prayers/${prayerId}/pray`).catch(() => {})
      await api.delete(`/api/church-prayers/${prayerId}`).catch(() => {})
    }
  })
})
