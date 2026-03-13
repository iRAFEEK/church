import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/analytics/posthog-client', () => ({
  posthog: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}))

import { analytics } from '@/lib/analytics/events'
import { posthog } from '@/lib/analytics/posthog-client'

const baseProps = { church_id: 'church-1', role: 'member', locale: 'ar' }

const CATEGORIES = [
  'auth',
  'nav',
  'member',
  'visitor',
  'group',
  'event',
  'finance',
  'notification',
  'announcement',
  'serving',
  'song',
  'bible',
  'prayer',
  'outreach',
  'community',
  'settings',
  'error',
] as const

describe('analytics event catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Every category has at least one event function
  it('every category has at least one event function', () => {
    for (const category of CATEGORIES) {
      const cat = analytics[category]
      const fns = Object.values(cat).filter((v) => typeof v === 'function')
      expect(fns.length, `category "${category}" has no event functions`).toBeGreaterThanOrEqual(1)
    }
  })

  // 2. Event names follow module_action_object naming convention
  it('event names follow module_action_object naming convention', () => {
    const sampleCalls: Array<{ category: string; fn: string; call: () => void }> = [
      { category: 'auth', fn: 'loggedIn', call: () => analytics.auth.loggedIn({ ...baseProps, method: 'email' }) },
      { category: 'member', fn: 'created', call: () => analytics.member.created({ ...baseProps, method: 'manual' }) },
      { category: 'visitor', fn: 'assigned', call: () => analytics.visitor.assigned({ ...baseProps, visitor_id: 'v1' }) },
      { category: 'group', fn: 'viewed', call: () => analytics.group.viewed({ ...baseProps, group_id: 'g1', group_type: 'bible_study' }) },
      { category: 'event', fn: 'created', call: () => analytics.event.created({ ...baseProps, event_type: 'service', from_template: false }) },
      { category: 'finance', fn: 'dashboardViewed', call: () => analytics.finance.dashboardViewed(baseProps) },
      { category: 'serving', fn: 'signedUp', call: () => analytics.serving.signedUp({ ...baseProps, slot_id: 's1', area_id: 'a1' }) },
      { category: 'song', fn: 'created', call: () => analytics.song.created({ ...baseProps, has_arabic: true }) },
      { category: 'bible', fn: 'chapterRead', call: () => analytics.bible.chapterRead({ ...baseProps, book: 'Genesis', chapter: 1, bible_version: 'svd' }) },
      { category: 'prayer', fn: 'requestSubmitted', call: () => analytics.prayer.requestSubmitted({ ...baseProps, is_private: false }) },
      { category: 'outreach', fn: 'visitLogged', call: () => analytics.outreach.visitLogged({ ...baseProps, visit_type: 'home' }) },
      { category: 'community', fn: 'needCreated', call: () => analytics.community.needCreated({ ...baseProps, category: 'supplies' }) },
      { category: 'settings', fn: 'permissionUpdated', call: () => analytics.settings.permissionUpdated({ ...baseProps, permission_key: 'can_edit', for_role: 'member' }) },
      { category: 'error', fn: 'apiError', call: () => analytics.error.apiError({ ...baseProps, endpoint: '/api/test', status_code: 500 }) },
    ]

    // module_action_object pattern: at least two underscores or known prefixes
    const validPattern = /^[a-z]+_[a-z_]+$/

    for (const { category, fn, call } of sampleCalls) {
      call()
      const lastCall = vi.mocked(posthog.capture).mock.lastCall
      expect(lastCall, `${category}.${fn} did not call posthog.capture`).toBeDefined()
      const eventName = lastCall![0] as string
      // Allow $-prefixed PostHog built-in events (e.g. $pageview, $revenue)
      if (!eventName.startsWith('$')) {
        expect(eventName, `${category}.${fn} event name "${eventName}" does not follow naming convention`).toMatch(validPattern)
      }
    }
  })

  // 3. No duplicate event names across all categories
  it('no duplicate event names across all categories', () => {
    const allEventNames: string[] = []

    // Call every event function and collect captured event names
    analytics.auth.loggedIn({ ...baseProps, method: 'email' })
    analytics.auth.loggedOut(baseProps)
    analytics.auth.churchSwitched({ ...baseProps, to_church_id: 'c2' })
    analytics.auth.churchRegistered({ locale: 'ar' })
    analytics.nav.pageViewed({ ...baseProps, path: '/', page_name: 'home' })
    analytics.nav.tabTapped({ ...baseProps, tab: 'home' })
    analytics.member.listViewed({ ...baseProps, count: 10 })
    analytics.member.profileViewed({ ...baseProps, member_id: 'm1' })
    analytics.member.created({ ...baseProps, method: 'manual' })
    analytics.member.roleChanged({ ...baseProps, member_id: 'm1', from_role: 'member', to_role: 'group_leader' })
    analytics.member.flaggedAtRisk({ ...baseProps, member_id: 'm1' })
    analytics.member.milestoneAdded({ ...baseProps, member_id: 'm1', milestone_type: 'baptism' })
    analytics.visitor.submittedQR({ church_id: 'c1', locale: 'ar' })
    analytics.visitor.assigned({ ...baseProps, visitor_id: 'v1' })
    analytics.visitor.statusUpdated({ ...baseProps, visitor_id: 'v1', from_status: 'new', to_status: 'assigned' })
    analytics.visitor.converted({ ...baseProps, visitor_id: 'v1' })
    analytics.group.listViewed({ ...baseProps, count: 5 })
    analytics.group.viewed({ ...baseProps, group_id: 'g1', group_type: 'bible_study' })
    analytics.group.gatheringCreated({ ...baseProps, group_id: 'g1', attendance_count: 8 })
    analytics.group.attendanceMarked({ ...baseProps, group_id: 'g1', gathering_id: 'ga1', present_count: 8, absent_count: 2, attendance_rate: 0.8 })
    analytics.group.prayerAdded({ ...baseProps, group_id: 'g1' })
    analytics.event.listViewed({ ...baseProps, count: 3 })
    analytics.event.viewed({ ...baseProps, event_id: 'e1', event_type: 'service' })
    analytics.event.created({ ...baseProps, event_type: 'service', from_template: false })
    analytics.event.registered({ ...baseProps, event_id: 'e1', event_type: 'service' })
    analytics.event.serviceAssigned({ ...baseProps, event_id: 'e1', ministry_id: 'min1' })
    analytics.finance.dashboardViewed(baseProps)
    analytics.finance.donationRecorded({ ...baseProps, amount: 100, currency: 'EGP', method: 'cash', fund_id: 'f1', has_campaign: false })
    analytics.finance.expenseSubmitted({ ...baseProps, amount: 50, currency: 'EGP', category: 'utilities' })
    analytics.finance.budgetCreated({ ...baseProps, fiscal_year: '2026', total_amount: 10000, currency: 'EGP', line_item_count: 5 })
    analytics.finance.campaignCreated({ ...baseProps, goal_amount: 50000, currency: 'EGP' })
    analytics.finance.reportGenerated({ ...baseProps, report_type: 'income', date_range_days: 30 })
    analytics.notification.sent({ ...baseProps, audience_size: 100, channels: ['push'], notification_type: 'general' })
    analytics.notification.read({ ...baseProps, notification_id: 'n1' })
    analytics.notification.pushGranted(baseProps)
    analytics.notification.pushDenied(baseProps)
    analytics.announcement.published({ ...baseProps, announcement_id: 'a1' })
    analytics.announcement.viewed({ ...baseProps, announcement_id: 'a1' })
    analytics.serving.slotCreated({ ...baseProps, area_id: 'ar1' })
    analytics.serving.signedUp({ ...baseProps, slot_id: 's1', area_id: 'ar1' })
    analytics.serving.signupCancelled({ ...baseProps, slot_id: 's1' })
    analytics.song.presenterOpened({ ...baseProps, song_id: 'so1' })
    analytics.song.created({ ...baseProps, has_arabic: true })
    analytics.bible.chapterRead({ ...baseProps, book: 'Genesis', chapter: 1, bible_version: 'svd' })
    analytics.bible.bookmarked({ ...baseProps, book: 'Genesis', chapter: 1 })
    analytics.bible.highlighted({ ...baseProps, book: 'Genesis', chapter: 1 })
    analytics.bible.searched({ ...baseProps, has_results: true })
    analytics.prayer.requestSubmitted({ ...baseProps, is_private: false })
    analytics.prayer.requestAssigned(baseProps)
    analytics.outreach.visitLogged({ ...baseProps, visit_type: 'home' })
    analytics.community.needCreated({ ...baseProps, category: 'supplies' })
    analytics.community.needViewed({ ...baseProps, need_id: 'cn1' })
    analytics.community.responseSubmitted({ ...baseProps, need_id: 'cn1' })
    analytics.community.messageSent({ ...baseProps, response_id: 'r1' })
    analytics.settings.permissionUpdated({ ...baseProps, permission_key: 'can_edit', for_role: 'member' })
    analytics.settings.featureToggled({ ...baseProps, feature: 'bible', enabled: true })
    analytics.error.apiError({ ...baseProps, endpoint: '/api/test', status_code: 500 })
    analytics.error.boundaryTriggered({ page: '/dashboard', error_message: 'Something went wrong' })

    const calls = vi.mocked(posthog.capture).mock.calls
    for (const call of calls) {
      allEventNames.push(call[0] as string)
    }

    // Filter out $-prefixed duplicates (e.g. $revenue is intentionally reused)
    const customEvents = allEventNames.filter((n) => !n.startsWith('$'))
    const uniqueNames = new Set(customEvents)
    expect(uniqueNames.size, `Found duplicate event names: ${customEvents.filter((n, i) => customEvents.indexOf(n) !== i).join(', ')}`).toBe(customEvents.length)
  })

  // 4. BaseProperties (church_id, role, locale) required on non-public events
  it('BaseProperties (church_id, role, locale) are passed through on non-public events', () => {
    analytics.member.created({ ...baseProps, method: 'manual' })

    const capturedProps = vi.mocked(posthog.capture).mock.calls[0][1] as Record<string, unknown>
    expect(capturedProps).toHaveProperty('church_id', 'church-1')
    expect(capturedProps).toHaveProperty('role', 'member')
    expect(capturedProps).toHaveProperty('locale', 'ar')
  })

  // 5. identify calls posthog.identify
  it('identify calls posthog.identify with user_id and traits', () => {
    analytics.identify({
      user_id: 'user-123',
      church_id: 'church-1',
      role: 'super_admin',
      locale: 'ar',
    })

    expect(posthog.identify).toHaveBeenCalledOnce()
    expect(posthog.identify).toHaveBeenCalledWith('user-123', {
      church_id: 'church-1',
      role: 'super_admin',
      locale: 'ar',
    })
  })

  // 6. reset calls posthog.reset
  it('reset calls posthog.reset', () => {
    analytics.reset()

    expect(posthog.reset).toHaveBeenCalledOnce()
  })

  // 7. finance.donationRecorded also captures $revenue event
  it('finance.donationRecorded captures both donation and $revenue events', () => {
    analytics.finance.donationRecorded({
      ...baseProps,
      amount: 250,
      currency: 'EGP',
      method: 'cash',
      fund_id: 'f1',
      has_campaign: true,
    })

    expect(posthog.capture).toHaveBeenCalledTimes(2)

    const [firstCall, secondCall] = vi.mocked(posthog.capture).mock.calls
    expect(firstCall[0]).toBe('finance_donation_recorded')
    expect(secondCall[0]).toBe('$revenue')
    expect(secondCall[1]).toMatchObject({
      revenue: 250,
      revenue_type: 'donation',
      church_id: 'church-1',
      currency: 'EGP',
    })
  })
})
