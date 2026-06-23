import { test, expect, type Page } from '@playwright/test'

/**
 * Persona feature matrix. For each persona we log in once and walk every route
 * they should reach ('render') and every route they must NOT ('blocked' — they
 * get bounced to /dashboard or /login). This is both the launch QA pass and
 * permanent regression coverage for the permission/role boundaries.
 *
 * 'blocked' entries marked SECURITY are deep-links into pages whose index is
 * guarded but whose own page.tsx had no guard — a member could otherwise
 * deep-link into them (RLS allows same-church reads). A ✗ on those is a real
 * permission leak.
 *
 * Needs a seeded TEST DB. Provide persona creds + a few ids via env (see
 * .env.e2e.example); each persona skips if its creds are absent.
 */
const ids = {
  member: process.env.E2E_MEMBER_ID,
  group: process.env.E2E_GROUP_ID,
  ministry: process.env.E2E_MINISTRY_ID,
  event: process.env.E2E_EVENT_ID,
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  // The submit click occasionally no-ops before hydration on a loaded dev
  // server; retry until we leave /login.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('button[type="submit"]').click().catch(() => {})
    try {
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
      return
    } catch {
      /* retry */
    }
  }
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

type Outcome = 'render' | 'blocked'
type Story = [path: string, expect: Outcome, note?: string]

const COMMON_RENDER: Story[] = [
  ['/dashboard', 'render'],
  ['/profile', 'render'],
  ['/profile/edit', 'render'],
  ['/events', 'render'],
  ['/serving', 'render'],
  ['/announcements', 'render'],
  ['/prayer', 'render'],
  ['/notifications', 'render'],
  ['/admin/songs', 'render', 'songs are viewable by all'],
  ['/bible', 'render'],
  ['/bible/bookmarks', 'render'],
  ['/liturgy', 'render'],
  ['/liturgy/agpeya', 'render'],
  ['/liturgy/readings', 'render'],
]

const personas: Record<string, { label: string; email?: string; password?: string; stories: Story[] }> = {
  member: {
    label: 'Youssef (member)',
    email: process.env.E2E_MEMBER_EMAIL,
    password: process.env.E2E_MEMBER_PASSWORD,
    stories: [
      ...COMMON_RENDER,
      // permission/role boundaries — must be blocked
      ['/admin/members', 'blocked'],
      ['/admin/visitors', 'blocked'],
      ['/admin/groups', 'blocked'],
      ['/admin/ministries', 'blocked'],
      ['/admin/calendar', 'blocked'],
      ['/admin/locations', 'blocked'],
      ['/admin/outreach', 'blocked'],
      ['/admin/prayers', 'blocked'],
      ['/admin/permissions', 'blocked'],
      ['/admin/settings', 'blocked'],
      ['/admin/settings/qr', 'blocked'],
      ['/community/needs', 'blocked', 'member lacks can_view_church_needs by default'],
      ['/finance/my-giving', 'blocked', 'finance OFF'],
      ['/admin/finance', 'blocked', 'finance OFF'],
      // deep-link security probes (index is guarded, page.tsx was not)
      [`/admin/members/${ids.member}`, 'blocked', 'SECURITY deep-link'],
      [`/admin/groups/${ids.group}`, 'blocked', 'SECURITY deep-link'],
      [`/admin/ministries/${ids.ministry}`, 'blocked', 'SECURITY deep-link'],
      [`/admin/events/${ids.event}/edit`, 'blocked', 'SECURITY deep-link'],
      [`/admin/permissions/${ids.member}`, 'blocked', 'SECURITY deep-link'],
      ['/admin/settings/roles', 'blocked', 'SECURITY deep-link'],
      ['/admin/templates', 'blocked', 'SECURITY deep-link (index unguarded)'],
    ],
  },
  group_leader: {
    label: 'Rita (group_leader)',
    email: process.env.E2E_LEADER_EMAIL,
    password: process.env.E2E_LEADER_PASSWORD,
    stories: [
      ...COMMON_RENDER,
      ['/my-group', 'render'],
      ['/visitors', 'render'],
      ['/admin/visitors', 'render', 'can_view_visitors'],
      ['/admin/groups', 'render', 'group_leader allowed'],
      ['/bookings', 'render', 'can_book_locations'],
      ['/bookings/mine', 'render'],
      ['/community/needs', 'render', 'can_view_church_needs'],
      [`/groups/${ids.group}`, 'render'],
      // blocked
      ['/admin/members', 'blocked'],
      ['/admin/ministries', 'blocked'],
      ['/admin/calendar', 'blocked', 'can_manage_events=false'],
      ['/admin/locations', 'blocked'],
      ['/admin/outreach', 'blocked'],
      ['/admin/prayers', 'blocked'],
      ['/admin/permissions', 'blocked'],
      ['/admin/settings', 'blocked'],
      ['/admin/finance', 'blocked', 'finance OFF'],
      [`/admin/members/${ids.member}`, 'blocked', 'SECURITY deep-link'],
      ['/admin/settings/roles', 'blocked', 'SECURITY deep-link'],
    ],
  },
  ministry_leader: {
    label: 'Boutros (ministry_leader)',
    email: process.env.E2E_MINLEADER_EMAIL,
    password: process.env.E2E_MINLEADER_PASSWORD,
    stories: [
      ...COMMON_RENDER,
      ['/admin/ministries', 'render'],
      [`/admin/ministries/${ids.ministry}`, 'render'],
      ['/admin/visitors', 'render', 'can_manage_visitors'],
      ['/admin/calendar', 'render', 'can_manage_events'],
      ['/admin/templates', 'render', 'can_manage_templates'],
      ['/admin/locations', 'render', 'can_manage_locations'],
      ['/bookings', 'render'],
      ['/admin/settings/qr', 'render', 'ministry_leader allowed'],
      ['/community/needs', 'render'],
      // blocked
      ['/admin/members', 'blocked', 'can_view_members=false'],
      ['/admin/groups', 'blocked', 'ministry_leader not in group_leader/super_admin'],
      ['/admin/prayers', 'blocked'],
      ['/admin/outreach', 'blocked'],
      ['/admin/permissions', 'blocked'],
      ['/admin/settings', 'blocked'],
      ['/admin/finance', 'blocked', 'finance OFF'],
      [`/admin/members/${ids.member}`, 'blocked', 'SECURITY deep-link'],
      ['/admin/settings/roles', 'blocked', 'SECURITY deep-link'],
    ],
  },
  super_admin: {
    label: 'Abanoub (super_admin)',
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    stories: [
      ...COMMON_RENDER,
      ['/admin/members', 'render'],
      [`/admin/members/${ids.member}`, 'render'],
      ['/admin/groups', 'render'],
      ['/admin/ministries', 'render'],
      [`/admin/ministries/${ids.ministry}`, 'render'],
      ['/admin/calendar', 'render'],
      ['/admin/templates', 'render'],
      ['/admin/locations', 'render'],
      ['/admin/visitors', 'render'],
      ['/admin/announcements/new', 'render'],
      ['/admin/prayers', 'render'],
      ['/admin/outreach', 'render'],
      ['/admin/permissions', 'render'],
      ['/admin/settings', 'render'],
      ['/admin/settings/roles', 'render'],
      ['/admin/settings/qr', 'render'],
      ['/community/needs', 'render'],
      ['/community/needs/new', 'render'],
      // finance is OFF even for super_admin
      ['/admin/finance', 'blocked', 'finance OFF'],
      ['/finance/my-giving', 'blocked', 'finance OFF'],
    ],
  },
}

for (const [key, p] of Object.entries(personas)) {
  test.describe(`Persona matrix — ${p.label}`, () => {
    test.skip(!(p.email && p.password), `Set creds for ${key}`)

    test('walks every feature (render vs blocked)', async ({ page }) => {
      test.setTimeout(300_000) // many on-demand dev compiles, serial
      await login(page, p.email!, p.password!)

      const BOUNCE = /\/(dashboard|login|onboarding)(\/|\?|$)/
      const fails: string[] = []
      for (const [path, want, note] of p.stories) {
        if (path.includes('undefined')) continue // id not provided
        await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => null)
        // Guards redirect CLIENT-side (Next returns 200 + shell, then bounces), so
        // poll the URL rather than read it once. For 'render' assert we stay on the
        // path; for 'blocked' assert we land on dashboard/login.
        const esc = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        let ok = true
        try {
          // Guards redirect client-side; on a loaded dev server that can take a
          // few seconds, so poll generously. (Run against a prod build for speed.)
          if (want === 'blocked') await expect(page).toHaveURL(BOUNCE, { timeout: 15000 })
          else await expect(page).toHaveURL(new RegExp(esc), { timeout: 15000 })
        } catch {
          ok = false
        }
        const final = new URL(page.url()).pathname
        const line = `${ok ? '✓' : '✗'} [${key}] ${want.padEnd(7)} ${path} → ${final}${note ? '  «' + note + '»' : ''}`
        // eslint-disable-next-line no-console
        console.log(line)
        if (!ok) fails.push(line)
      }
      expect(fails, `\n${fails.join('\n')}\n`).toEqual([])
    })
  })
}
