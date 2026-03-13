import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Chainable Supabase mock
// ---------------------------------------------------------------------------

interface MockRow {
  [key: string]: unknown
}

interface MockQueryResult {
  data: MockRow[] | null
}

interface MockQueryBuilder {
  select: (cols: string, opts?: Record<string, unknown>) => MockQueryBuilder
  eq: (col: string, val: unknown) => MockQueryBuilder
  in: (col: string, vals: unknown[]) => MockQueryBuilder
  not: (col: string, op: string, val: unknown) => MockQueryBuilder
  then: (
    resolve: (value: MockQueryResult) => void,
    reject?: (reason: unknown) => void
  ) => void
}

type FromHandler = (table: string) => MockQueryBuilder

let fromHandler: FromHandler

function buildChain(data: MockRow[] | null): MockQueryBuilder {
  const chain: MockQueryBuilder = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    then(resolve) {
      resolve({ data })
    },
  }
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => fromHandler(table),
  })),
}))

// ---------------------------------------------------------------------------
// Import under test (after mock registration)
// ---------------------------------------------------------------------------

import { resolveAudience, countAudience, type AudienceTarget } from '../audience'

const CHURCH_ID = 'church-001'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setFromHandler(handler: FromHandler) {
  fromHandler = handler
}

function defaultHandler(): FromHandler {
  return () => buildChain([])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveAudience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setFromHandler(defaultHandler())
  })

  it('all_church returns all active profiles', async () => {
    setFromHandler((table) => {
      if (table === 'profiles') {
        return buildChain([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }])
      }
      return buildChain([])
    })

    const result = await resolveAudience(CHURCH_ID, [{ type: 'all_church' }])

    expect(result.profileIds).toEqual(['p1', 'p2', 'p3'])
    expect(result.visitorPhones).toEqual([])
  })

  it('roles target filters by role array', async () => {
    setFromHandler((table) => {
      if (table === 'profiles') {
        return buildChain([{ id: 'leader-1' }, { id: 'leader-2' }])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'roles', roles: ['ministry_leader', 'super_admin'] }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(result.profileIds).toEqual(['leader-1', 'leader-2'])
  })

  it('groups resolves group_members', async () => {
    setFromHandler((table) => {
      if (table === 'group_members') {
        return buildChain([{ profile_id: 'gm-1' }, { profile_id: 'gm-2' }])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'groups', groupIds: ['g1', 'g2'] }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(result.profileIds).toEqual(['gm-1', 'gm-2'])
  })

  it('ministries resolves via groups then group_members', async () => {
    let groupMembersCalled = false

    setFromHandler((table) => {
      if (table === 'groups') {
        return buildChain([{ id: 'grp-a' }, { id: 'grp-b' }])
      }
      if (table === 'group_members') {
        groupMembersCalled = true
        return buildChain([{ profile_id: 'mm-1' }, { profile_id: 'mm-2' }])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'ministries', ministryIds: ['m1'] }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(groupMembersCalled).toBe(true)
    expect(result.profileIds).toEqual(['mm-1', 'mm-2'])
  })

  it('statuses filters by status array', async () => {
    setFromHandler((table) => {
      if (table === 'profiles') {
        return buildChain([{ id: 'at-risk-1' }])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'statuses', statuses: ['at_risk'] }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(result.profileIds).toEqual(['at-risk-1'])
  })

  it('gender filters by gender', async () => {
    setFromHandler((table) => {
      if (table === 'profiles') {
        return buildChain([{ id: 'f-1' }, { id: 'f-2' }])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'gender', gender: 'female' }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(result.profileIds).toEqual(['f-1', 'f-2'])
  })

  it('visitors returns phones and names', async () => {
    setFromHandler((table) => {
      if (table === 'visitors') {
        return buildChain([
          { phone: '+201234', first_name: 'John', last_name: 'Doe' },
          { phone: '+205678', first_name: 'Jane', last_name: 'Smith' },
        ])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'visitors', visitorStatuses: ['new'] }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(result.profileIds).toEqual([])
    expect(result.visitorPhones).toEqual([
      { phone: '+201234', name: 'John Doe' },
      { phone: '+205678', name: 'Jane Smith' },
    ])
  })

  it('visitors without phone are excluded', async () => {
    setFromHandler((table) => {
      if (table === 'visitors') {
        return buildChain([
          { phone: '+201234', first_name: 'Has', last_name: 'Phone' },
          { phone: null, first_name: 'No', last_name: 'Phone' },
        ])
      }
      return buildChain([])
    })

    const target: AudienceTarget = { type: 'visitors', visitorStatuses: ['new', 'assigned'] }
    const result = await resolveAudience(CHURCH_ID, [target])

    expect(result.visitorPhones).toEqual([{ phone: '+201234', name: 'Has Phone' }])
  })

  it('multiple targets deduplicates profileIds', async () => {
    let callCount = 0
    setFromHandler((table) => {
      if (table === 'profiles') {
        callCount++
        // First call (all_church) returns p1, p2; second call (roles) returns p2, p3
        if (callCount === 1) {
          return buildChain([{ id: 'p1' }, { id: 'p2' }])
        }
        return buildChain([{ id: 'p2' }, { id: 'p3' }])
      }
      return buildChain([])
    })

    const targets: AudienceTarget[] = [
      { type: 'all_church' },
      { type: 'roles', roles: ['super_admin'] },
    ]
    const result = await resolveAudience(CHURCH_ID, targets)

    // p2 should appear only once
    expect(result.profileIds).toHaveLength(3)
    expect(new Set(result.profileIds).size).toBe(3)
    expect(result.profileIds).toContain('p1')
    expect(result.profileIds).toContain('p2')
    expect(result.profileIds).toContain('p3')
  })

  it('empty targets array returns empty result', async () => {
    const result = await resolveAudience(CHURCH_ID, [])

    expect(result.profileIds).toEqual([])
    expect(result.visitorPhones).toEqual([])
  })

  it('null data from supabase returns empty arrays', async () => {
    setFromHandler(() => buildChain(null))

    const targets: AudienceTarget[] = [
      { type: 'all_church' },
      { type: 'visitors', visitorStatuses: ['new'] },
    ]
    const result = await resolveAudience(CHURCH_ID, targets)

    expect(result.profileIds).toEqual([])
    expect(result.visitorPhones).toEqual([])
  })
})

describe('countAudience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setFromHandler(defaultHandler())
  })

  it('returns correct counts for mixed targets', async () => {
    let callCount = 0
    setFromHandler((table) => {
      if (table === 'profiles') {
        callCount++
        return buildChain([{ id: 'p1' }, { id: 'p2' }])
      }
      if (table === 'visitors') {
        return buildChain([{ phone: '+20111', first_name: 'V', last_name: 'One' }])
      }
      return buildChain([])
    })

    const targets: AudienceTarget[] = [
      { type: 'all_church' },
      { type: 'visitors', visitorStatuses: ['new'] },
    ]
    const counts = await countAudience(CHURCH_ID, targets)

    expect(counts.profileCount).toBe(2)
    expect(counts.visitorCount).toBe(1)
    expect(counts.total).toBe(3)
  })
})
