import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/messaging/triggers')
vi.mock('@/lib/logger')

import { createClient } from '@/lib/supabase/server'
import { notifyAtRiskMember } from '@/lib/messaging/triggers'
import { getConsecutiveAbsences, checkAndFlagAtRisk } from '../absence'

// ── Chainable Supabase mock builder ────────────────────────────────────────────

function buildChain(resolvedValue: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'range', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  // Make chain itself thenable so `await supabase.from(...).select(...).eq(...)...` resolves
  const thenable = {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(resolvedValue).then(resolve, reject),
  }
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue({ ...chain, ...thenable })
  }

  chain.single = vi.fn().mockResolvedValue(resolvedValue)

  return { ...chain, ...thenable }
}

// Per-table chain storage so mockFrom can return different chains per table
let tableChains: Record<string, ReturnType<typeof buildChain>>
let mockFrom: ReturnType<typeof vi.fn>
let mockSupabase: { from: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
  tableChains = {}
  mockFrom = vi.fn((table: string) => {
    return tableChains[table] ?? buildChain({ data: null, error: null })
  })
  mockSupabase = { from: mockFrom }
  vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
  vi.mocked(notifyAtRiskMember).mockResolvedValue(undefined as never)
})

// ── getConsecutiveAbsences ─────────────────────────────────────────────────────

describe('getConsecutiveAbsences', () => {
  it('returns 0 when no gatherings exist', async () => {
    tableChains['gatherings'] = buildChain({ data: [], error: null })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(0)
  })

  it('returns 0 when gatherings data is null', async () => {
    tableChains['gatherings'] = buildChain({ data: null, error: null })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(0)
  })

  it('returns 0 when member attended the most recent gathering', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'present' },
        { gathering_id: 'g2', status: 'absent' },
        { gathering_id: 'g3', status: 'absent' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(0)
  })

  it('returns 2 for two consecutive absences', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'absent' },
        { gathering_id: 'g3', status: 'present' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(2)
  })

  it('returns 4 for four consecutive absences', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }, { id: 'g5' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'absent' },
        { gathering_id: 'g3', status: 'absent' },
        { gathering_id: 'g4', status: 'absent' },
        { gathering_id: 'g5', status: 'present' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(4)
  })

  it('counts missing attendance record (no entry) as absent', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    // Only g3 has a record — g1 and g2 have no attendance entries
    tableChains['attendance'] = buildChain({
      data: [{ gathering_id: 'g3', status: 'present' }],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    // g1: no record → absent, g2: no record → absent, g3: present → break
    expect(result).toBe(2)
  })

  it('breaks streak on "present" status', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'present' },
        { gathering_id: 'g3', status: 'absent' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(1)
  })

  it('breaks streak on "excused" status', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'excused' },
        { gathering_id: 'g3', status: 'absent' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(1)
  })

  it('breaks streak on "late" status', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'late' },
        { gathering_id: 'g3', status: 'absent' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1')
    expect(result).toBe(1)
  })

  it('respects custom lookback limit parameter', async () => {
    tableChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }],
      error: null,
    })
    tableChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'absent' },
      ],
      error: null,
    })

    const result = await getConsecutiveAbsences('profile-1', 'group-1', 2)

    expect(result).toBe(2)
    // Verify .limit() was called with the custom lookback value
    const gatheringsChain = tableChains['gatherings']
    expect(gatheringsChain.limit).toHaveBeenCalledWith(2)
  })
})

// ── checkAndFlagAtRisk ─────────────────────────────────────────────────────────

describe('checkAndFlagAtRisk', () => {
  it('does nothing when gathering is not found', async () => {
    // .single() returns null data
    tableChains['gatherings'] = buildChain({ data: null, error: null })

    await checkAndFlagAtRisk('gathering-999')

    // Should have queried gatherings but nothing else
    expect(mockFrom).toHaveBeenCalledWith('gatherings')
    expect(mockFrom).not.toHaveBeenCalledWith('group_members')
    expect(mockFrom).not.toHaveBeenCalledWith('profiles')
  })

  it('flags member as at_risk when streak >= 2', async () => {
    // checkAndFlagAtRisk calls createClient() once, then getConsecutiveAbsences calls it again
    // We need separate supabase instances for each call

    // First call: checkAndFlagAtRisk's own supabase
    const mainChains: Record<string, ReturnType<typeof buildChain>> = {}

    // gatherings single() for the main function
    const gatheringChain = buildChain({ data: { group_id: 'grp-1', church_id: 'ch-1' }, error: null })
    mainChains['gatherings'] = gatheringChain

    // group_members
    mainChains['group_members'] = buildChain({
      data: [{ profile_id: 'member-1' }],
      error: null,
    })

    // profiles update (count > 0 means status changed)
    mainChains['profiles'] = buildChain({ data: null, error: null, count: 1 })

    const mainFrom = vi.fn((table: string) => mainChains[table] ?? buildChain({ data: null, error: null }))
    const mainSupabase = { from: mainFrom }

    // Second call: getConsecutiveAbsences's supabase
    const absenceChains: Record<string, ReturnType<typeof buildChain>> = {}
    absenceChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }],
      error: null,
    })
    absenceChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'absent' },
        { gathering_id: 'g3', status: 'present' },
      ],
      error: null,
    })
    const absenceFrom = vi.fn((table: string) => absenceChains[table] ?? buildChain({ data: null, error: null }))
    const absenceSupabase = { from: absenceFrom }

    vi.mocked(createClient)
      .mockResolvedValueOnce(mainSupabase as never)
      .mockResolvedValueOnce(absenceSupabase as never)

    await checkAndFlagAtRisk('gathering-1')

    // profiles.update should have been called
    expect(mainFrom).toHaveBeenCalledWith('profiles')
    // notifyAtRiskMember should have been called
    expect(notifyAtRiskMember).toHaveBeenCalledWith('member-1', 'grp-1', 'ch-1', 2)
  })

  it('sends notification only when status actually changed (count > 0)', async () => {
    const mainChains: Record<string, ReturnType<typeof buildChain>> = {}

    mainChains['gatherings'] = buildChain({ data: { group_id: 'grp-1', church_id: 'ch-1' }, error: null })
    mainChains['group_members'] = buildChain({
      data: [{ profile_id: 'member-1' }],
      error: null,
    })
    // count: 0 means member was already at_risk — no status change
    mainChains['profiles'] = buildChain({ data: null, error: null, count: 0 })

    const mainFrom = vi.fn((table: string) => mainChains[table] ?? buildChain({ data: null, error: null }))
    const mainSupabase = { from: mainFrom }

    const absenceChains: Record<string, ReturnType<typeof buildChain>> = {}
    absenceChains['gatherings'] = buildChain({
      data: [{ id: 'g1' }, { id: 'g2' }],
      error: null,
    })
    absenceChains['attendance'] = buildChain({
      data: [
        { gathering_id: 'g1', status: 'absent' },
        { gathering_id: 'g2', status: 'absent' },
      ],
      error: null,
    })
    const absenceFrom = vi.fn((table: string) => absenceChains[table] ?? buildChain({ data: null, error: null }))
    const absenceSupabase = { from: absenceFrom }

    vi.mocked(createClient)
      .mockResolvedValueOnce(mainSupabase as never)
      .mockResolvedValueOnce(absenceSupabase as never)

    await checkAndFlagAtRisk('gathering-1')

    // Update was called but notification should NOT fire since count was 0
    expect(mainFrom).toHaveBeenCalledWith('profiles')
    expect(notifyAtRiskMember).not.toHaveBeenCalled()
  })
})
