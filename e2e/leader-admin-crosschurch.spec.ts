import { test, expect, type Page } from '@playwright/test'

/**
 * Phase B/C — leader, admin, and cross-church MUTATIONS, via the real APIs with
 * each persona's logged-in session. Proves the higher-privilege features work
 * end to end. Self-cleaning where a DELETE endpoint exists; the rest are tagged
 * "[E2E]" and swept from the DB after the run.
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
const ok = (s: number) => s >= 200 && s < 300
const body = async (r: import('@playwright/test').APIResponse) =>
  (await r.json().catch(() => ({}))) as { data?: { id?: string }; id?: string }
const idOf = (j: { data?: { id?: string }; id?: string }) => j?.data?.id ?? j?.id

test.describe('Phase B — group leader: gathering + attendance', () => {
  const leader = { email: process.env.E2E_LEADER_EMAIL, password: process.env.E2E_LEADER_PASSWORD }
  test.skip(!(leader.email && leader.password && process.env.E2E_GROUP_ID), 'Set E2E_LEADER_* + E2E_GROUP_ID')

  test('a group leader creates a gathering and marks attendance', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, leader.email!, leader.password!)
    const g = await page.request.post('/api/gatherings', {
      data: { group_id: process.env.E2E_GROUP_ID, scheduled_at: new Date().toISOString(), topic: '[E2E] gathering' },
    })
    // eslint-disable-next-line no-console
    console.log(`GATHERING create → ${g.status()}`)
    expect(ok(g.status()), `gathering create (${g.status()})`).toBeTruthy()
    const gid = idOf(await body(g))
    if (gid && process.env.E2E_MEMBER_ID) {
      const a = await page.request.post(`/api/gatherings/${gid}/attendance`, {
        data: { records: [{ profile_id: process.env.E2E_MEMBER_ID, status: 'present' }] },
      })
      // eslint-disable-next-line no-console
      console.log(`ATTENDANCE → ${a.status()}`)
      expect(ok(a.status()), `attendance (${a.status()})`).toBeTruthy()
    }
  })
})

test.describe('Phase B — admin: announcement', () => {
  const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }
  test.skip(!(admin.email && admin.password), 'Set E2E_ADMIN_*')

  test('an admin publishes an announcement', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page, admin.email!, admin.password!)
    const r = await page.request.post('/api/announcements', {
      data: { title: '[E2E] announcement', body: 'test', status: 'published', is_pinned: false },
    })
    // eslint-disable-next-line no-console
    console.log(`ANNOUNCEMENT create → ${r.status()}`)
    expect(ok(r.status()), `announcement create (${r.status()})`).toBeTruthy()
    const id = idOf(await body(r))
    if (id) await page.request.delete(`/api/announcements/${id}`).catch(() => {})
  })
})

test.describe('Phase C — cross-church marketplace', () => {
  const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }
  const churchB = { email: process.env.E2E_CHURCHB_EMAIL, password: process.env.E2E_CHURCHB_PASSWORD }
  test.skip(
    !(admin.email && admin.password && churchB.email && churchB.password),
    'Set E2E_ADMIN_* + E2E_CHURCHB_*',
  )

  test('church A posts a need; church B sees it and responds (cross-church)', async ({ page }) => {
    test.setTimeout(120_000)

    // Church A (Grace) posts a fresh need.
    await login(page, admin.email!, admin.password!)
    const n = await page.request.post('/api/community/needs', {
      data: { title: '[E2E] cross-church need', category: 'supplies', quantity: 1, urgency: 'low' },
    })
    // eslint-disable-next-line no-console
    console.log(`NEED post (church A) → ${n.status()}`)
    expect(ok(n.status()), `need post (${n.status()})`).toBeTruthy()
    const needId = idOf(await body(n))

    // Church B (different church) responds to it — proves the cross-church flow.
    await login(page, churchB.email!, churchB.password!)
    const resp = await page.request.post(`/api/community/needs/${needId}/responses`, {
      data: { message: '[E2E] our church can help' },
    })
    // eslint-disable-next-line no-console
    console.log(`church B RESPOND → ${resp.status()}`)
    expect(ok(resp.status()), `cross-church response (${resp.status()})`).toBeTruthy()

    // A duplicate response from the same church is correctly rejected (409).
    const dup = await page.request.post(`/api/community/needs/${needId}/responses`, {
      data: { message: '[E2E] again' },
    })
    // eslint-disable-next-line no-console
    console.log(`church B duplicate → ${dup.status()} (expect 409)`)
    expect(dup.status(), 'duplicate response must be rejected').toBe(409)

    // Cleanup: Church A deletes the need (cascade removes the response).
    await login(page, admin.email!, admin.password!)
    if (needId) await page.request.delete(`/api/community/needs/${needId}`).catch(() => {})
  })
})
