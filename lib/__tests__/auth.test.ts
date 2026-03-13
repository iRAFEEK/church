import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeProfile } from '@/lib/api/__tests__/fixtures/factories'
import { HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock react cache as passthrough
vi.mock('react', () => ({
  cache: (fn: Function) => fn,
}))

// Mock next/navigation redirect — throws so we can assert on redirect targets
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

// Build a chainable Supabase mock that can be configured per-test
function buildSupabaseMock() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
    'is', 'not', 'or', 'order', 'range', 'limit', 'throwOnError',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    chain,
    client: {
      from: vi.fn().mockReturnValue(chain),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }
}

let mockSb: ReturnType<typeof buildSupabaseMock>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSb.client),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHURCH_ID = 'church-001'
const USER_ID = 'user-001'

function makeChurch(overrides: Record<string, unknown> = {}) {
  return {
    id: CHURCH_ID,
    name: 'Test Church',
    name_ar: 'كنيسة اختبار',
    country: 'EG',
    timezone: 'Africa/Cairo',
    primary_language: 'ar',
    ...overrides,
  }
}

/**
 * Configure the supabase mock chain so that sequential `.single()` calls
 * return different values (profiles, user_churches, role_permission_defaults).
 */
function configureSingleCalls(
  ...results: Array<{ data: unknown; error: unknown }>
) {
  let callIndex = 0
  mockSb.chain.single.mockImplementation(() => {
    const result = results[callIndex] ?? { data: null, error: null }
    callIndex++
    return Promise.resolve(result)
  })
}

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are wired
// ---------------------------------------------------------------------------

// We need a fresh import per test suite since `getCurrentUserWithRole` uses
// react `cache` (mocked as passthrough), so no stale closure issues.
import {
  hasRole,
  isAdmin,
  isLeader,
  getCurrentUserWithRole,
  getCurrentUserSafe,
  requireRole,
  requirePermission,
  resolveApiPermissions,
} from '@/lib/auth'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockSb = buildSupabaseMock()
})

// ==========================================================================
// Pure functions — hasRole, isAdmin, isLeader
// ==========================================================================

describe('hasRole', () => {
  it('returns true when profile role matches', () => {
    const profile = makeProfile({ role: 'member' }) as any
    expect(hasRole(profile, 'member')).toBe(true)
  })

  it('returns false when profile role does not match', () => {
    const profile = makeProfile({ role: 'member' }) as any
    expect(hasRole(profile, 'super_admin')).toBe(false)
  })

  it('returns true when role matches any of variadic args', () => {
    const profile = makeProfile({ role: 'group_leader' }) as any
    expect(hasRole(profile, 'member', 'group_leader', 'super_admin')).toBe(true)
  })

  it('returns false when role matches none of variadic args', () => {
    const profile = makeProfile({ role: 'member' }) as any
    expect(hasRole(profile, 'group_leader', 'super_admin')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('returns true for ministry_leader', () => {
    expect(isAdmin(makeProfile({ role: 'ministry_leader' }) as any)).toBe(true)
  })

  it('returns true for super_admin', () => {
    expect(isAdmin(makeProfile({ role: 'super_admin' }) as any)).toBe(true)
  })

  it('returns false for member', () => {
    expect(isAdmin(makeProfile({ role: 'member' }) as any)).toBe(false)
  })

  it('returns false for group_leader', () => {
    expect(isAdmin(makeProfile({ role: 'group_leader' }) as any)).toBe(false)
  })
})

describe('isLeader', () => {
  it('returns true for group_leader', () => {
    expect(isLeader(makeProfile({ role: 'group_leader' }) as any)).toBe(true)
  })

  it('returns true for ministry_leader', () => {
    expect(isLeader(makeProfile({ role: 'ministry_leader' }) as any)).toBe(true)
  })

  it('returns true for super_admin', () => {
    expect(isLeader(makeProfile({ role: 'super_admin' }) as any)).toBe(true)
  })

  it('returns false for member', () => {
    expect(isLeader(makeProfile({ role: 'member' }) as any)).toBe(false)
  })
})

// ==========================================================================
// resolveApiPermissions
// ==========================================================================

describe('resolveApiPermissions', () => {
  it('uses profile.role when userId is not provided', async () => {
    const sb = buildSupabaseMock()
    // role_permission_defaults query returns null (no church defaults)
    sb.chain.single.mockResolvedValue({ data: null, error: null })

    const profile = { role: 'member', church_id: CHURCH_ID, permissions: null }
    const result = await resolveApiPermissions(sb.client, profile)

    // Should NOT have queried user_churches
    expect(sb.client.from).not.toHaveBeenCalledWith('user_churches')
    // Should match hardcoded member defaults
    expect(result).toEqual(HARDCODED_ROLE_DEFAULTS.member)
  })

  it('queries user_churches when userId is provided', async () => {
    const sb = buildSupabaseMock()
    let singleCallCount = 0
    sb.chain.single.mockImplementation(() => {
      singleCallCount++
      if (singleCallCount === 1) {
        // user_churches — returns a membership with same role
        return Promise.resolve({ data: { role: 'member' }, error: null })
      }
      // role_permission_defaults — no church defaults
      return Promise.resolve({ data: null, error: null })
    })

    const profile = { role: 'member', church_id: CHURCH_ID, permissions: null }
    await resolveApiPermissions(sb.client, profile, USER_ID)

    expect(sb.client.from).toHaveBeenCalledWith('user_churches')
  })

  it('membership role overrides profile.role when different', async () => {
    const sb = buildSupabaseMock()
    let singleCallCount = 0
    sb.chain.single.mockImplementation(() => {
      singleCallCount++
      if (singleCallCount === 1) {
        // user_churches gives ministry_leader
        return Promise.resolve({ data: { role: 'ministry_leader' }, error: null })
      }
      // role_permission_defaults — no church defaults
      return Promise.resolve({ data: null, error: null })
    })

    const profile = { role: 'member', church_id: CHURCH_ID, permissions: null }
    const result = await resolveApiPermissions(sb.client, profile, USER_ID)

    // Should use ministry_leader defaults, not member
    expect(result).toEqual(HARDCODED_ROLE_DEFAULTS.ministry_leader)
  })

  it('falls back to profile.role when no membership found', async () => {
    const sb = buildSupabaseMock()
    let singleCallCount = 0
    sb.chain.single.mockImplementation(() => {
      singleCallCount++
      if (singleCallCount === 1) {
        // user_churches — not found
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const profile = { role: 'group_leader', church_id: CHURCH_ID, permissions: null }
    const result = await resolveApiPermissions(sb.client, profile, USER_ID)

    expect(result).toEqual(HARDCODED_ROLE_DEFAULTS.group_leader)
  })

  it('merges church-level role defaults', async () => {
    const sb = buildSupabaseMock()
    // No userId, so only role_permission_defaults query
    sb.chain.single.mockResolvedValue({
      data: { permissions: { can_manage_songs: true } },
      error: null,
    })

    const profile = { role: 'member', church_id: CHURCH_ID, permissions: null }
    const result = await resolveApiPermissions(sb.client, profile)

    // member normally has can_manage_songs: false
    expect(result.can_manage_songs).toBe(true)
    // other defaults unchanged
    expect(result.can_view_own_giving).toBe(true)
    expect(result.can_manage_members).toBe(false)
  })

  it('applies user permission overrides (additive)', async () => {
    const sb = buildSupabaseMock()
    sb.chain.single.mockResolvedValue({ data: null, error: null })

    const profile = {
      role: 'member',
      church_id: CHURCH_ID,
      permissions: { can_view_reports: true },
    }
    const result = await resolveApiPermissions(sb.client, profile)

    // member normally has can_view_reports: false, but user override adds it
    expect(result.can_view_reports).toBe(true)
  })

  it('super_admin always gets all permissions regardless of overrides', async () => {
    const sb = buildSupabaseMock()
    sb.chain.single.mockResolvedValue({ data: null, error: null })

    const profile = {
      role: 'super_admin',
      church_id: CHURCH_ID,
      permissions: { can_view_members: false },
    }
    const result = await resolveApiPermissions(sb.client, profile)

    // super_admin ignores everything — all true
    for (const val of Object.values(result)) {
      expect(val).toBe(true)
    }
  })
})

// ==========================================================================
// getCurrentUserWithRole
// ==========================================================================

describe('getCurrentUserWithRole', () => {
  it('redirects to /login when getUser returns no user', async () => {
    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('not authenticated'),
    })

    await expect(getCurrentUserWithRole()).rejects.toThrow('REDIRECT:/login')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirects to /login when profile is not found', async () => {
    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    // profiles query returns no data
    configureSingleCalls(
      { data: null, error: { message: 'not found' } },
    )

    await expect(getCurrentUserWithRole()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects to /login when church data is missing', async () => {
    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    // Profile found but church is null
    configureSingleCalls(
      { data: { ...makeProfile({ id: USER_ID, church_id: CHURCH_ID }), church: null }, error: null },
    )

    await expect(getCurrentUserWithRole()).rejects.toThrow('REDIRECT:/login')
  })

  it('returns AuthUser with effectiveRole from user_churches', async () => {
    const profile = makeProfile({ id: USER_ID, church_id: CHURCH_ID, role: 'member' })
    const church = makeChurch()

    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      // profiles query
      { data: { ...profile, church }, error: null },
      // user_churches query — returns ministry_leader
      { data: { role: 'ministry_leader' }, error: null },
      // role_permission_defaults
      { data: null, error: null },
    )

    const result = await getCurrentUserWithRole()

    expect(result.id).toBe(USER_ID)
    expect(result.email).toBe('test@test.com')
    expect(result.profile.role).toBe('ministry_leader')
    expect(result.church.id).toBe(CHURCH_ID)
  })

  it('falls back to profile.role when no user_churches membership', async () => {
    const profile = makeProfile({ id: USER_ID, church_id: CHURCH_ID, role: 'group_leader' })
    const church = makeChurch()

    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      { data: { ...profile, church }, error: null },
      // user_churches — not found
      { data: null, error: null },
      // role_permission_defaults
      { data: null, error: null },
    )

    const result = await getCurrentUserWithRole()

    expect(result.profile.role).toBe('group_leader')
  })
})

// ==========================================================================
// getCurrentUserSafe
// ==========================================================================

describe('getCurrentUserSafe', () => {
  it('returns null when getUser fails', async () => {
    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('no session'),
    })

    const result = await getCurrentUserSafe()
    expect(result).toBeNull()
  })

  it('returns null when profile is not found', async () => {
    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      { data: null, error: null },
    )

    const result = await getCurrentUserSafe()
    expect(result).toBeNull()
  })

  it('returns null when church data is missing', async () => {
    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      { data: { ...makeProfile({ id: USER_ID, church_id: CHURCH_ID }), church: null }, error: null },
    )

    const result = await getCurrentUserSafe()
    expect(result).toBeNull()
  })

  it('returns AuthUser on success', async () => {
    const profile = makeProfile({ id: USER_ID, church_id: CHURCH_ID, role: 'member' })
    const church = makeChurch()

    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      { data: { ...profile, church }, error: null },
      // user_churches
      { data: null, error: null },
      // role_permission_defaults
      { data: null, error: null },
    )

    const result = await getCurrentUserSafe()

    expect(result).not.toBeNull()
    expect(result!.id).toBe(USER_ID)
    expect(result!.profile.role).toBe('member')
    expect(result!.church).toBeDefined()
    expect(result!.resolvedPermissions).toBeDefined()
  })
})

// ==========================================================================
// requireRole
// ==========================================================================

describe('requireRole', () => {
  function setupAuthUser(role: string) {
    const profile = makeProfile({ id: USER_ID, church_id: CHURCH_ID, role })
    const church = makeChurch()

    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      { data: { ...profile, church }, error: null },
      // user_churches returns same role
      { data: { role }, error: null },
      // no church defaults
      { data: null, error: null },
    )
  }

  it('redirects to /dashboard when user role is not allowed', async () => {
    setupAuthUser('member')

    await expect(requireRole('super_admin')).rejects.toThrow('REDIRECT:/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('returns user when role matches', async () => {
    setupAuthUser('super_admin')

    const result = await requireRole('super_admin', 'ministry_leader')

    expect(result.profile.role).toBe('super_admin')
  })
})

// ==========================================================================
// requirePermission
// ==========================================================================

describe('requirePermission', () => {
  function setupAuthUser(role: string) {
    const profile = makeProfile({ id: USER_ID, church_id: CHURCH_ID, role })
    const church = makeChurch()

    mockSb.client.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'test@test.com' } },
      error: null,
    })
    configureSingleCalls(
      { data: { ...profile, church }, error: null },
      { data: { role }, error: null },
      { data: null, error: null },
    )
  }

  it('redirects to /dashboard when permission is missing', async () => {
    setupAuthUser('member')

    // member does not have can_manage_members
    await expect(requirePermission('can_manage_members')).rejects.toThrow('REDIRECT:/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('returns user when permission is granted', async () => {
    setupAuthUser('super_admin')

    const result = await requirePermission('can_manage_members')

    expect(result.profile.role).toBe('super_admin')
    expect(result.resolvedPermissions.can_manage_members).toBe(true)
  })
})
