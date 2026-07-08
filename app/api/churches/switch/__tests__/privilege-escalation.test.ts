import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import { NextRequest } from 'next/server'

/**
 * P0 — multi-church privilege-escalation prevention.
 *
 * These EXECUTE the switch handler (previously this file only grep'd the source, which
 * gave a false green — it would pass even if the handler were broken). The core property:
 * switching to a church where you are only a `member` must set your role to `member`, NOT
 * carry over a `super_admin` role from another church.
 */

// Per-test map of the caller's role in each church; the mock resolves user_churches from it.
let ucRoles: Record<string, string> = {}
let updatePayload: Record<string, unknown> | undefined
const mockGetUser = vi.fn()

function makeChain(table: string) {
  let churchEq: string | undefined
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'limit', 'insert', 'upsert']) chain[m] = vi.fn(() => chain)
  chain.eq = vi.fn((col: string, val: string) => { if (col === 'church_id') churchEq = val; return chain })
  chain.update = vi.fn((p: Record<string, unknown>) => { updatePayload = p; return chain })
  chain.single = vi.fn(async () => {
    if (table === 'profiles') return { data: { id: 'user-1', church_id: 'a0000000-0000-4000-8000-000000000001', role: 'super_admin', status: 'active', permissions: null }, error: null }
    if (table === 'user_churches') {
      const role = ucRoles[churchEq ?? '']
      return { data: role ? { role, status: 'active' } : null, error: null }
    }
    if (table === 'role_permission_defaults') return { data: { permissions: null }, error: null }
    return { data: null, error: null }
  })
  ;(chain as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve({ error: null }).then(res, rej)
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: vi.fn((t: string) => makeChain(t)) })),
}))
vi.mock('@/lib/auth', () => ({ resolveApiPermissions: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/membership', () => ({ isActiveMembership: (s: string | null | undefined) => s == null || s === 'active' }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api/rate-limit', () => ({ checkRateLimit: vi.fn().mockReturnValue(null), checkRateLimitAsync: vi.fn().mockResolvedValue(null) }))

import { POST as switchChurch } from '@/app/api/churches/switch/route'

const req = (body: object) =>
  new NextRequest('http://localhost/api/churches/switch', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.clearAllMocks()
  ucRoles = { 'a0000000-0000-4000-8000-000000000001': 'super_admin', 'b0000000-0000-4000-8000-000000000002': 'member' }
  updatePayload = undefined
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@t.com' } }, error: null })
})

describe('P0: church switch does NOT escalate privilege (executing)', () => {
  it('switching to a church where you are only a member sets role=member (not super_admin)', async () => {
    const res = await switchChurch(req({ church_id: 'b0000000-0000-4000-8000-000000000002' }))
    expect(res.status).toBe(200)
    // THE security assertion: role is set to the TARGET-church role, never carried over.
    expect(updatePayload).toEqual({ church_id: 'b0000000-0000-4000-8000-000000000002', role: 'member' })
  })

  it('rejects switching to a church you are not a member of (403, no update)', async () => {
    ucRoles = { 'a0000000-0000-4000-8000-000000000001': 'super_admin' } // no membership in church-X
    const res = await switchChurch(req({ church_id: 'c0000000-0000-4000-8000-000000000003' }))
    expect(res.status).toBe(403)
    expect(updatePayload).toBeUndefined()
  })

  it('preserves an elevated role only when it genuinely belongs to the target church', async () => {
    ucRoles = { 'a0000000-0000-4000-8000-000000000001': 'member', 'b0000000-0000-4000-8000-000000000002': 'super_admin' }
    const res = await switchChurch(req({ church_id: 'b0000000-0000-4000-8000-000000000002' }))
    expect(res.status).toBe(200)
    expect(updatePayload).toEqual({ church_id: 'b0000000-0000-4000-8000-000000000002', role: 'super_admin' })
  })
})

// Secondary structural guards (cheap; the executing tests above prove the behavior).
describe('P0: supporting invariants (source guards)', () => {
  it('register endpoint seeds a user_churches super_admin row', () => {
    const content = fs.readFileSync('app/api/churches/register/route.ts', 'utf-8')
    expect(content).toContain("from('user_churches')")
    expect(content).toContain("role: 'super_admin'")
  })
  it('apiHandler cross-references user_churches role + status', () => {
    const content = fs.readFileSync('lib/api/handler.ts', 'utf-8')
    expect(content).toContain("from('user_churches')")
    expect(content).toContain("select('role, status')")
  })
})
