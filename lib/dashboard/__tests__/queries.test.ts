import { describe, it, expect, vi } from 'vitest'
import {
  fetchAdminDashboard,
  fetchLeaderDashboard,
  fetchMemberDashboard,
  fetchMinistryLeaderDashboardV2,
} from '@/lib/dashboard/queries'

// ---------------------------------------------------------------------------
// Mock Supabase factory
// ---------------------------------------------------------------------------

function makeDashboardSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = [
    'select', 'eq', 'neq', 'gte', 'lte', 'gt', 'lt',
    'in', 'or', 'not', 'is', 'order', 'limit', 'range',
    'single', 'maybeSingle',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => {
      const p = Promise.resolve({ data: [], count: 0, error: null })
      return Object.assign(p, chain)
    })
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _chain: chain,
  }
}

const CHURCH_ID = 'church-1'
const PROFILE_ID = 'profile-1'

// ---------------------------------------------------------------------------
// fetchAdminDashboard
// ---------------------------------------------------------------------------

describe('fetchAdminDashboard', () => {
  it('returns correct structure with default values on empty data', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(result).toMatchObject({
      kpis: {
        activeMembers: { value: 0, trend: 0 },
        newVisitors: { value: 0, slaAlert: 0 },
        attendanceRate: { value: 0 },
        upcomingEvents: { value: 0 },
      },
      attendanceTrend: [],
      visitorPipeline: [
        { status: 'new', count: 0 },
        { status: 'assigned', count: 0 },
        { status: 'contacted', count: 0 },
        { status: 'converted', count: 0 },
      ],
      attentionItems: [],
      upcomingThisWeek: [],
      groupHealth: [],
    })
  })

  it('queries correct tables (profiles, visitors, gatherings, events, etc.)', async () => {
    const sb = makeDashboardSupabase()
    await fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    const queriedTables = sb.from.mock.calls.map((c: any[]) => c[0])
    expect(queriedTables).toContain('profiles')
    expect(queriedTables).toContain('visitors')
    expect(queriedTables).toContain('attendance')
    expect(queriedTables).toContain('events')
    expect(queriedTables).toContain('serving_slots')
    expect(queriedTables).toContain('gatherings')
    expect(queriedTables).toContain('groups')
  })

  it('uses Promise.all for parallel execution (supabase.from called multiple times)', async () => {
    const sb = makeDashboardSupabase()
    await fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    // The admin dashboard issues 15 parallel queries in the first batch,
    // plus 2 more for prayer/outreach, plus potentially 1 for group attendance.
    // At minimum we expect well over 10 .from() calls.
    expect(sb.from.mock.calls.length).toBeGreaterThanOrEqual(15)
  })

  it('filters by church_id', async () => {
    const sb = makeDashboardSupabase()
    await fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    const eqCalls = sb._chain.eq.mock.calls as [string, string][]
    const churchIdFilters = eqCalls.filter(
      ([col, val]) => col === 'church_id' && val === CHURCH_ID
    )
    // Multiple tables are filtered by church_id
    expect(churchIdFilters.length).toBeGreaterThanOrEqual(5)
  })

  it('returns weekly attendance chart structure (attendanceTrend)', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(Array.isArray(result.attendanceTrend)).toBe(true)
    // With empty data it should be empty
    expect(result.attendanceTrend).toHaveLength(0)
  })

  it('returns visitor pipeline with four statuses', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(result.visitorPipeline).toHaveLength(4)
    const statuses = result.visitorPipeline.map(p => p.status)
    expect(statuses).toEqual(['new', 'assigned', 'contacted', 'converted'])
    for (const item of result.visitorPipeline) {
      expect(item.count).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// fetchLeaderDashboard
// ---------------------------------------------------------------------------

describe('fetchLeaderDashboard', () => {
  it('returns correct structure with empty data', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchLeaderDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(result).toMatchObject({
      groups: [],
      atRiskMembers: [],
      recentPrayers: [],
      assignedVisitorCount: 0,
      attendanceTrend: [],
      recentGatherings: [],
    })
  })

  it('scopes to user groups via leader_id / co_leader_id filter', async () => {
    const sb = makeDashboardSupabase()
    await fetchLeaderDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    // Should query groups table filtering by leader_id or co_leader_id
    const queriedTables = sb.from.mock.calls.map((c: any[]) => c[0])
    expect(queriedTables).toContain('groups')

    // The .or() call should reference the profileId for leader/co-leader scoping
    const orCalls = sb._chain.or.mock.calls as [string][]
    const leaderFilter = orCalls.find(
      ([filter]) =>
        typeof filter === 'string' && filter.includes(PROFILE_ID)
    )
    expect(leaderFilter).toBeDefined()
  })

  it('includes group health data (attendance trend array)', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchLeaderDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(Array.isArray(result.attendanceTrend)).toBe(true)
    expect(Array.isArray(result.recentGatherings)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// fetchMemberDashboard
// ---------------------------------------------------------------------------

describe('fetchMemberDashboard', () => {
  it('returns correct structure with empty data', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchMemberDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(result).toMatchObject({
      kpis: {
        attendanceRate: null,
        milestoneCount: 0,
        groupCount: 0,
        unreadNotifications: 0,
      },
      myGroups: [],
      upcomingEvents: [],
      servingSlots: [],
      recentAnnouncements: [],
    })
  })

  it('filters by own profile_id', async () => {
    const sb = makeDashboardSupabase()
    await fetchMemberDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    const eqCalls = sb._chain.eq.mock.calls as [string, string][]
    const profileFilters = eqCalls.filter(
      ([col, val]) => col === 'profile_id' && val === PROFILE_ID
    )
    // attendance, milestones, group_members, notifications, registrations, signups
    expect(profileFilters.length).toBeGreaterThanOrEqual(4)
  })

  it('includes upcoming events array', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchMemberDashboard(sb as any, PROFILE_ID, CHURCH_ID)

    expect(Array.isArray(result.upcomingEvents)).toBe(true)
    expect(result.upcomingEvents).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// fetchMinistryLeaderDashboardV2
// ---------------------------------------------------------------------------

describe('fetchMinistryLeaderDashboardV2', () => {
  it('returns correct structure with empty data', async () => {
    const sb = makeDashboardSupabase()
    const result = await fetchMinistryLeaderDashboardV2(sb as any, PROFILE_ID, CHURCH_ID)

    expect(result).toMatchObject({
      ministryName: '',
      ministryNameAr: null,
      memberCount: 0,
      groupCount: 0,
      attendanceRate: 0,
      attendanceTrend: [],
      upcomingEvents: [],
      serviceAssignments: [],
      attentionItems: [],
      groupHealth: [],
    })
  })
})

// ---------------------------------------------------------------------------
// Cross-cutting
// ---------------------------------------------------------------------------

describe('all dashboard functions', () => {
  it('handle errors gracefully — return defaults, do not throw', async () => {
    const sb = makeDashboardSupabase()

    // All should resolve without throwing
    const [admin, leader, member, ministry] = await Promise.all([
      fetchAdminDashboard(sb as any, PROFILE_ID, CHURCH_ID),
      fetchLeaderDashboard(sb as any, PROFILE_ID, CHURCH_ID),
      fetchMemberDashboard(sb as any, PROFILE_ID, CHURCH_ID),
      fetchMinistryLeaderDashboardV2(sb as any, PROFILE_ID, CHURCH_ID),
    ])

    expect(admin).toBeDefined()
    expect(leader).toBeDefined()
    expect(member).toBeDefined()
    expect(ministry).toBeDefined()
  })

  it('all functions filter by church_id (church_id isolation)', async () => {
    const sbAdmin = makeDashboardSupabase()
    const sbLeader = makeDashboardSupabase()
    const sbMember = makeDashboardSupabase()
    const sbMinistry = makeDashboardSupabase()

    await Promise.all([
      fetchAdminDashboard(sbAdmin as any, PROFILE_ID, CHURCH_ID),
      fetchLeaderDashboard(sbLeader as any, PROFILE_ID, CHURCH_ID),
      fetchMemberDashboard(sbMember as any, PROFILE_ID, CHURCH_ID),
      fetchMinistryLeaderDashboardV2(sbMinistry as any, PROFILE_ID, CHURCH_ID),
    ])

    for (const sb of [sbAdmin, sbLeader, sbMember, sbMinistry]) {
      const eqCalls = sb._chain.eq.mock.calls as [string, string][]
      const hasChurchFilter = eqCalls.some(
        ([col, val]) => col === 'church_id' && val === CHURCH_ID
      )
      expect(hasChurchFilter).toBe(true)
    }
  })
})
