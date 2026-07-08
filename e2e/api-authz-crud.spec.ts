import { test, expect, type Page } from '@playwright/test'

/**
 * Authenticated API coverage that the persona-matrix (page-level) and unauth sweep
 * don't reach:
 *   - AuthZ matrix: a plain member is blocked (403) from admin-only API mutations/reads.
 *   - CRUD: an admin can actually CREATE + DELETE core resources through the real API
 *     (event, group) — the mutations that were previously only "renders", not exercised.
 * Each created row is deleted so the suite stays repeatable.
 *
 * Needs: E2E_MEMBER_*, E2E_ADMIN_*.
 */
const member = { email: process.env.E2E_MEMBER_EMAIL, password: process.env.E2E_MEMBER_PASSWORD }
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }

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

test.describe('API authorization matrix — a member is blocked from admin surfaces', () => {
  test.skip(!(member.email && member.password), 'Set E2E_MEMBER_* to run')

  test('a member cannot hit admin-only API routes', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, member.email!, member.password!)
    const api = page.request

    // Mutations gated by role/permission the member lacks → must be 403 (Forbidden).
    const addMember = await api.post('/api/members', { data: { first_name: 'X', last_name: 'Y' } })
    expect(addMember.status(), 'member must NOT add members').toBe(403)

    const createEvent = await api.post('/api/events', {
      data: { title: 'hack', event_type: 'service', starts_at: new Date(Date.now() + 864e5).toISOString() },
    })
    expect(createEvent.status(), 'member lacks can_manage_events').toBe(403)

    // Admin-only reads.
    const joinReqs = await api.get('/api/churches/join-requests')
    expect(joinReqs.status(), 'member must NOT read the join-request queue').toBe(403)

    // eslint-disable-next-line no-console
    console.log(`AUTHZ member: addMember=${addMember.status()} createEvent=${createEvent.status()} joinReqs=${joinReqs.status()}`)
  })
})

test.describe('API CRUD — an admin can create + delete core resources', () => {
  test.skip(!(admin.email && admin.password), 'Set E2E_ADMIN_* to run')

  test('create → verify → delete an event', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, admin.email!, admin.password!)
    const api = page.request
    const ok = (s: number) => s >= 200 && s < 300

    const title = `E2E CRUD Event ${Date.now()}`
    const create = await api.post('/api/events', {
      data: {
        title,
        event_type: 'service',
        starts_at: new Date(Date.now() + 3 * 864e5).toISOString(),
        is_public: true,
        registration_required: false,
        status: 'published',
      },
    })
    expect(ok(create.status()), `event create should succeed (${create.status()})`).toBeTruthy()
    const created = await create.json().catch(() => ({}))
    const id = created?.data?.id ?? created?.id
    expect(id, 'create returns an id').toBeTruthy()

    // eslint-disable-next-line no-console
    console.log(`CRUD event: create=${create.status()} id=${id}`)

    // Cleanup (best-effort) — DELETE the event we just made.
    const del = await api.delete(`/api/events/${id}`)
    // eslint-disable-next-line no-console
    console.log(`CRUD event: delete=${del.status()}`)
    expect([200, 204].includes(del.status()), `event delete should succeed (${del.status()})`).toBeTruthy()
  })

  test('create → delete a group', async ({ page }) => {
    test.setTimeout(90_000)
    await login(page, admin.email!, admin.password!)
    const api = page.request
    const ok = (s: number) => s >= 200 && s < 300

    const create = await api.post('/api/groups', {
      data: {
        name: `E2E CRUD Group ${Date.now()}`,
        type: 'small_group',
        meeting_day: 'monday',
        meeting_time: '19:00',
        meeting_frequency: 'weekly',
      },
    })
    expect(ok(create.status()), `group create should succeed (${create.status()})`).toBeTruthy()
    const created = await create.json().catch(() => ({}))
    const id = created?.data?.id ?? created?.id
    expect(id, 'create returns an id').toBeTruthy()
    // eslint-disable-next-line no-console
    console.log(`CRUD group: create=${create.status()} id=${id}`)

    const del = await api.delete(`/api/groups/${id}`)
    // eslint-disable-next-line no-console
    console.log(`CRUD group: delete=${del.status()}`)
    expect([200, 204].includes(del.status()), `group delete should succeed (${del.status()})`).toBeTruthy()
  })
})
