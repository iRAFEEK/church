import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SendableScopes } from '@/lib/messaging/scopes'
import type { AudienceTarget } from '@/lib/messaging/audience'

// ---------------------------------------------------------------------------
// Mock: Supabase chainable query builder
// ---------------------------------------------------------------------------
type MockRow = Record<string, string | boolean>

function createChainableQuery(resolvedData: MockRow[] | null = []) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  }
  // Make the chain thenable so `await` resolves to { data }
  Object.defineProperty(chain, 'then', {
    value(
      onFulfilled?: (v: { data: MockRow[] | null }) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) {
      return Promise.resolve({ data: resolvedData }).then(onFulfilled, onRejected)
    },
    writable: true,
    enumerable: false,
  })
  return chain
}

let fromReturnMap: Record<string, ReturnType<typeof createChainableQuery>>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      const mock = fromReturnMap[table]
      if (!mock) {
        throw new Error(`Unmocked table access: ${table}`)
      }
      return mock
    },
  })),
}))

// Import after mock is set up
const { getSendableScopes, validateTargetsAgainstScopes } = await import(
  '@/lib/messaging/scopes'
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_ID = 'user-abc-123'
const CHURCH_ID = 'church-xyz-456'

beforeEach(() => {
  vi.clearAllMocks()
  fromReturnMap = {}
})

// ===========================================================================
// getSendableScopes
// ===========================================================================
describe('getSendableScopes', () => {
  // 1
  it('member returns canSend=false', async () => {
    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'member')

    expect(scopes.canSend).toBe(false)
    expect(scopes.role).toBe('member')
    expect(scopes.allowedTargetTypes).toEqual([])
    expect(scopes.isUnscoped).toBe(false)
  })

  // 2
  it('super_admin returns isUnscoped=true and canSend=true', async () => {
    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'super_admin')

    expect(scopes.canSend).toBe(true)
    expect(scopes.isUnscoped).toBe(true)
    expect(scopes.role).toBe('super_admin')
  })

  // 3
  it('super_admin allowedTargetTypes includes all 7 types', async () => {
    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'super_admin')

    expect(scopes.allowedTargetTypes).toEqual([
      'all_church',
      'roles',
      'groups',
      'ministries',
      'statuses',
      'visitors',
      'gender',
    ])
    expect(scopes.allowedTargetTypes).toHaveLength(7)
  })

  // 4
  it('ministry_leader returns led ministry IDs and child group IDs', async () => {
    fromReturnMap['ministry_members'] = createChainableQuery([
      { ministry_id: 'min-1' },
    ])
    fromReturnMap['ministries'] = createChainableQuery([{ id: 'min-2' }])
    fromReturnMap['groups'] = createChainableQuery([
      { id: 'grp-a' },
      { id: 'grp-b' },
    ])

    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'ministry_leader')

    expect(scopes.canSend).toBe(true)
    expect(scopes.isUnscoped).toBe(false)
    expect(scopes.ministryIds).toEqual(expect.arrayContaining(['min-1', 'min-2']))
    expect(scopes.ministryIds).toHaveLength(2)
    expect(scopes.groupIds).toEqual(['grp-a', 'grp-b'])
    expect(scopes.allowedTargetTypes).toEqual(['ministries', 'groups'])
  })

  // 5
  it('ministry_leader with no ministries returns canSend=false', async () => {
    fromReturnMap['ministry_members'] = createChainableQuery([])
    fromReturnMap['ministries'] = createChainableQuery([])

    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'ministry_leader')

    expect(scopes.canSend).toBe(false)
    expect(scopes.role).toBe('ministry_leader')
    expect(scopes.ministryIds).toEqual([])
  })

  // 6
  it('group_leader returns led group IDs', async () => {
    fromReturnMap['groups'] = createChainableQuery([
      { id: 'grp-x' },
      { id: 'grp-y' },
    ])

    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'group_leader')

    expect(scopes.canSend).toBe(true)
    expect(scopes.isUnscoped).toBe(false)
    expect(scopes.groupIds).toEqual(['grp-x', 'grp-y'])
    expect(scopes.ministryIds).toEqual([])
    expect(scopes.allowedTargetTypes).toEqual(['groups'])
  })

  // 7
  it('group_leader with no groups returns canSend=false', async () => {
    fromReturnMap['groups'] = createChainableQuery([])

    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'group_leader')

    expect(scopes.canSend).toBe(false)
    expect(scopes.role).toBe('group_leader')
    expect(scopes.groupIds).toEqual([])
  })

  // 8
  it('unknown role returns canSend=false', async () => {
    const scopes = await getSendableScopes(USER_ID, CHURCH_ID, 'deacon')

    expect(scopes.canSend).toBe(false)
    expect(scopes.role).toBe('deacon')
    expect(scopes.allowedTargetTypes).toEqual([])
    expect(scopes.isUnscoped).toBe(false)
  })
})

// ===========================================================================
// validateTargetsAgainstScopes (pure function — no mocks)
// ===========================================================================
describe('validateTargetsAgainstScopes', () => {
  const makeScopes = (overrides: Partial<SendableScopes> = {}): SendableScopes => ({
    role: 'ministry_leader',
    allowedTargetTypes: ['ministries', 'groups'],
    ministryIds: ['min-1', 'min-2'],
    groupIds: ['grp-a', 'grp-b'],
    canSend: true,
    isUnscoped: false,
    ...overrides,
  })

  // 9
  it('returns error when canSend is false', () => {
    const scopes = makeScopes({ canSend: false })
    const targets: AudienceTarget[] = [{ type: 'all_church' }]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  // 10
  it('returns valid:true for any target when isUnscoped', () => {
    const scopes = makeScopes({ isUnscoped: true, canSend: true })
    const targets: AudienceTarget[] = [
      { type: 'all_church' },
      { type: 'visitors', visitorStatuses: ['new'] },
      { type: 'gender', gender: 'male' },
    ]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  // 11
  it('rejects disallowed target type', () => {
    const scopes = makeScopes({ allowedTargetTypes: ['groups'] })
    const targets: AudienceTarget[] = [{ type: 'all_church' }]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('all_church')
  })

  // 12
  it('rejects out-of-scope ministryIds', () => {
    const scopes = makeScopes({ ministryIds: ['min-1'] })
    const targets: AudienceTarget[] = [
      { type: 'ministries', ministryIds: ['min-1', 'min-999'] },
    ]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('ministries you lead')
  })

  // 13
  it('rejects out-of-scope groupIds', () => {
    const scopes = makeScopes({ groupIds: ['grp-a'] })
    const targets: AudienceTarget[] = [
      { type: 'groups', groupIds: ['grp-a', 'grp-unknown'] },
    ]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('groups you lead')
  })

  // 14
  it('allows in-scope ministryIds', () => {
    const scopes = makeScopes({ ministryIds: ['min-1', 'min-2'] })
    const targets: AudienceTarget[] = [
      { type: 'ministries', ministryIds: ['min-1', 'min-2'] },
    ]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(true)
  })

  // 15
  it('allows in-scope groupIds', () => {
    const scopes = makeScopes({ groupIds: ['grp-a', 'grp-b'] })
    const targets: AudienceTarget[] = [
      { type: 'groups', groupIds: ['grp-a'] },
    ]

    const result = validateTargetsAgainstScopes(targets, scopes)

    expect(result.valid).toBe(true)
  })
})
