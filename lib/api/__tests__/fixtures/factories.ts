// Shared test factories for the Ekklesia project.
// Produces type-compatible objects for use in mocked API route tests.

import type { PermissionKey } from '@/types'
import { HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'

type UserRole = 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'

const uuid = () => crypto.randomUUID()

export function makeProfile(overrides: Record<string, unknown> = {}) {
  const defaults = {
    id: uuid(),
    church_id: uuid(),
    first_name: 'Mina',
    last_name: 'Sameh',
    first_name_ar: 'مينا',
    last_name_ar: 'سامح',
    email: 'mina@test.com',
    phone: '+201012345678',
    role: 'member' as UserRole,
    status: 'active',
    permissions: null,
    onboarding_completed: true,
    created_at: new Date().toISOString(),
  }
  return { ...defaults, ...overrides }
}

export function makeAuthContext(
  role: UserRole = 'super_admin',
  churchId: string = 'church-test-123',
) {
  const profile = makeProfile({ role, church_id: churchId })
  const resolvedPermissions = { ...HARDCODED_ROLE_DEFAULTS[role] }
  return {
    user: { id: 'user-test-1', email: 'test@test.com' },
    profile,
    churchId,
    resolvedPermissions,
  }
}

export function makeSupabaseChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not',
    'or', 'order', 'range', 'limit', 'throwOnError',
  ]

  // Terminal methods return resolved promises
  const terminals = ['single', 'maybeSingle']

  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  for (const m of terminals) {
    chain[m] = vi.fn().mockResolvedValue({ data: null, error: null })
  }

  // Make order/range also resolve when used as terminal
  chain.order.mockImplementation(() => {
    // Return the chain so more methods can be chained
    // But if .then() is called on it directly (await), resolve
    const p = Promise.resolve({ data: [], error: null, count: 0 })
    return Object.assign(p, chain)
  })

  chain.range.mockImplementation(() => {
    const p = Promise.resolve({ data: [], error: null, count: 0 })
    return Object.assign(p, chain)
  })

  return chain
}

export function makeSupabase() {
  const chain = makeSupabaseChain()
  return {
    _chain: chain,
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }
}

export function makeReq(
  url: string,
  method = 'GET',
  body?: object,
) {
  const { NextRequest } = require('next/server')
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}
