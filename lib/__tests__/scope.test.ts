import { describe, it, expect, vi } from 'vitest'
import { resolveUserScope } from '../scope'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChainableMock {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  data: unknown[] | null
}

function makeChainableMock(resolvedData: { data: unknown[] | null }): ChainableMock {
  const chain = {} as ChainableMock
  const methods: Array<keyof Omit<ChainableMock, 'data'>> = ['select', 'eq', 'in', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => ({ ...chain, ...resolvedData }))
  }
  chain.data = resolvedData.data
  return chain
}

interface MockSupabase {
  from: ReturnType<typeof vi.fn>
}

function buildSupabase(config: Record<string, { data: unknown[] | null }>): MockSupabase {
  // Track call index so that two calls to the same table can return different data
  const callCounts: Record<string, number> = {}
  const chains: Record<string, ChainableMock[]> = {}

  for (const [table, resolved] of Object.entries(config)) {
    if (!chains[table]) chains[table] = []
    chains[table].push(makeChainableMock(resolved))
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (!callCounts[table]) callCounts[table] = 0
      const idx = callCounts[table]
      callCounts[table] += 1
      const tableChains = chains[table] ?? []
      // If more calls than configured chains, cycle the last one
      return tableChains[Math.min(idx, tableChains.length - 1)] ?? makeChainableMock({ data: [] })
    }),
  }
}

// The function calls from('ministry_members') twice (once for IDs, once for worship check).
// We need two separate chain entries for ministry_members.
function buildSupabaseWithTwoMinistryChains(
  ministryLeaderData: unknown[] | null,
  groupData: unknown[] | null,
  servingData: unknown[] | null,
  worshipData: unknown[] | null
): MockSupabase {
  const ministryChain1 = makeChainableMock({ data: ministryLeaderData })
  const ministryChain2 = makeChainableMock({ data: worshipData })
  const groupChain = makeChainableMock({ data: groupData })
  const servingChain = makeChainableMock({ data: servingData })

  let ministryCallCount = 0

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'ministry_members') {
        ministryCallCount += 1
        return ministryCallCount === 1 ? ministryChain1 : ministryChain2
      }
      if (table === 'group_members') return groupChain
      if (table === 'serving_area_leaders') return servingChain
      return makeChainableMock({ data: [] })
    }),
  }
}

const PROFILE_ID = 'profile-001'
const CHURCH_ID = 'church-001'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveUserScope', () => {
  it('returns empty arrays when no leadership roles exist', async () => {
    const supabase = buildSupabaseWithTwoMinistryChains(null, null, null, null)

    const result = await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)

    expect(result).toEqual({
      ministryIds: [],
      groupIds: [],
      servingAreaIds: [],
      isWorshipMinistryMember: false,
    })
  })

  it('returns ministry_ids for leaders and co-leaders', async () => {
    const ministryData = [
      { ministry_id: 'min-1' },
      { ministry_id: 'min-2' },
    ]

    const supabase = buildSupabaseWithTwoMinistryChains(ministryData, [], [], [])

    const result = await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)

    expect(result.ministryIds).toEqual(['min-1', 'min-2'])
  })

  it('returns group_ids for leaders and co-leaders', async () => {
    const groupData = [
      { group_id: 'grp-1' },
      { group_id: 'grp-3' },
    ]

    const supabase = buildSupabaseWithTwoMinistryChains([], groupData, [], [])

    const result = await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)

    expect(result.groupIds).toEqual(['grp-1', 'grp-3'])
  })

  it('returns serving_area_ids', async () => {
    const servingData = [
      { serving_area_id: 'sa-10' },
      { serving_area_id: 'sa-20' },
      { serving_area_id: 'sa-30' },
    ]

    const supabase = buildSupabaseWithTwoMinistryChains([], [], servingData, [])

    const result = await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)

    expect(result.servingAreaIds).toEqual(['sa-10', 'sa-20', 'sa-30'])
  })

  it('detects worship ministry by English name patterns', async () => {
    const worshipData = [
      { ministry: { name: 'Worship Team' } },
      { ministry: { name: 'Youth Fellowship' } },
    ]

    const supabase = buildSupabaseWithTwoMinistryChains([], [], [], worshipData)
    const result = await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)
    expect(result.isWorshipMinistryMember).toBe(true)

    // Also verify "music" keyword
    const musicData = [{ ministry: { name: 'Music Ministry' } }]
    const supabase2 = buildSupabaseWithTwoMinistryChains([], [], [], musicData)
    const result2 = await resolveUserScope(supabase2, PROFILE_ID, CHURCH_ID)
    expect(result2.isWorshipMinistryMember).toBe(true)
  })

  it('detects worship ministry by Arabic name patterns', async () => {
    // Test 'ترانيم' (hymns)
    const aranicData = [{ ministry: { name: 'فريق ترانيم' } }]
    const supabase1 = buildSupabaseWithTwoMinistryChains([], [], [], aranicData)
    const result1 = await resolveUserScope(supabase1, PROFILE_ID, CHURCH_ID)
    expect(result1.isWorshipMinistryMember).toBe(true)

    // Test 'تسبيح' (praise)
    const praiseData = [{ ministry: { name: 'خدمة تسبيح' } }]
    const supabase2 = buildSupabaseWithTwoMinistryChains([], [], [], praiseData)
    const result2 = await resolveUserScope(supabase2, PROFILE_ID, CHURCH_ID)
    expect(result2.isWorshipMinistryMember).toBe(true)
  })

  it('returns false for non-worship ministry', async () => {
    const nonWorshipData = [
      { ministry: { name: 'Youth Ministry' } },
      { ministry: { name: 'Outreach Team' } },
      { ministry: { name: 'خدمة الشباب' } },
    ]

    const supabase = buildSupabaseWithTwoMinistryChains([], [], [], nonWorshipData)

    const result = await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)

    expect(result.isWorshipMinistryMember).toBe(false)
  })

  it('runs all 4 queries in parallel via Promise.all', async () => {
    const supabase = buildSupabaseWithTwoMinistryChains([], [], [], [])

    await resolveUserScope(supabase, PROFILE_ID, CHURCH_ID)

    // supabase.from should have been called exactly 4 times
    expect(supabase.from).toHaveBeenCalledTimes(4)

    // Verify the table names passed
    const calls = supabase.from.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ministry_members')
    expect(calls).toContain('group_members')
    expect(calls).toContain('serving_area_leaders')
    // ministry_members appears twice (leader query + worship check)
    expect(calls.filter((t: string) => t === 'ministry_members')).toHaveLength(2)
  })
})
