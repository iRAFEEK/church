import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeProfile, makeAuthContext, makeSupabaseChain, makeSupabase, makeReq } from '@/lib/api/__tests__/fixtures/factories'
import { revalidateTag } from 'next/cache'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn(), unstable_cache: vi.fn((fn: Function) => fn) }))

const BASE_URL = 'http://localhost:3000/api/finance/accounts'

describe('/api/finance/accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── helpers ──────────────────────────────────────────

  async function setupAuth(role: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin', churchId = 'church-1') {
    const ctx = makeAuthContext(role, churchId)
    const supabase = makeSupabase()

    supabase.auth.getUser.mockResolvedValue({ data: { user: ctx.user }, error: null })

    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const profileChain = makeSupabaseChain()
        profileChain.single.mockResolvedValue({ data: { ...ctx.profile, church: { id: ctx.churchId } }, error: null })
        return profileChain
      }
      if (table === 'user_churches') {
        const ucChain = makeSupabaseChain()
        ucChain.single.mockResolvedValue({ data: { role: ctx.profile.role }, error: null })
        return ucChain
      }
      if (table === 'role_permission_defaults') {
        const rpChain = makeSupabaseChain()
        rpChain.single.mockResolvedValue({ data: null, error: null })
        return rpChain
      }
      return supabase._chain
    })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    return { ctx, supabase }
  }

  async function setupUnauth() {
    const supabase = makeSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'not authenticated' } })

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    return { supabase }
  }

  // ─── GET ──────────────────────────────────────────────

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      await setupUnauth()

      const { GET } = await import('../route')
      const req = makeReq(BASE_URL)
      const res = await GET(req)

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('returns 403 when user lacks can_view_finances', async () => {
      await setupAuth('member', 'church-1')

      const { GET } = await import('../route')
      const req = makeReq(BASE_URL)
      const res = await GET(req)

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBe('Forbidden')
    })

    it('filters by church_id', async () => {
      const { supabase } = await setupAuth('super_admin', 'church-1')

      const { GET } = await import('../route')
      const req = makeReq(BASE_URL)
      await GET(req)

      // The route's own query goes through supabase._chain
      // Verify .eq was called with church_id
      const eqCalls = supabase._chain.eq.mock.calls as string[][]
      const churchIdCall = eqCalls.find(
        (args) => args[0] === 'church_id'
      )
      expect(churchIdCall).toBeTruthy()
    })

    it('supports type query param', async () => {
      const { supabase } = await setupAuth('super_admin', 'church-1')

      const { GET } = await import('../route')
      const req = makeReq(`${BASE_URL}?type=asset`)
      await GET(req)

      const eqCalls = supabase._chain.eq.mock.calls as string[][]
      const typeCall = eqCalls.find(
        (args) => args[0] === 'account_type' && args[1] === 'asset'
      )
      expect(typeCall).toBeTruthy()
    })

    it('supports active=false query param', async () => {
      const { supabase } = await setupAuth('super_admin', 'church-1')

      const { GET } = await import('../route')
      const req = makeReq(`${BASE_URL}?active=false`)
      await GET(req)

      // When active=false, the route should NOT call .eq('is_active', true)
      const eqCalls = supabase._chain.eq.mock.calls as string[][]
      const activeCall = eqCalls.find(
        (args) => args[0] === 'is_active' && (args[1] as unknown) === true
      )
      expect(activeCall).toBeUndefined()
    })

    it('supports headers_only query param', async () => {
      const { supabase } = await setupAuth('super_admin', 'church-1')

      const { GET } = await import('../route')
      const req = makeReq(`${BASE_URL}?headers_only=true`)
      await GET(req)

      const eqCalls = supabase._chain.eq.mock.calls as string[][]
      const headerCall = eqCalls.find(
        (args) => args[0] === 'is_header' && (args[1] as unknown) === true
      )
      expect(headerCall).toBeTruthy()
    })
  })

  // ─── POST ─────────────────────────────────────────────

  describe('POST', () => {
    const validBody = {
      code: '1001',
      name: 'Cash',
      name_ar: 'نقدي',
      account_type: 'asset' as const,
      currency: 'EGP',
      is_header: false,
      is_active: true,
      display_order: 1,
    }

    it('returns 401 when unauthenticated', async () => {
      await setupUnauth()

      const { POST } = await import('../route')
      const req = makeReq(BASE_URL, 'POST', validBody)
      const res = await POST(req)

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('returns 422 with invalid body', async () => {
      await setupAuth('super_admin', 'church-1')

      const { POST } = await import('../route')
      // Missing required 'code' and 'name' and 'account_type'
      const req = makeReq(BASE_URL, 'POST', { currency: 'EGP' })
      const res = await POST(req)

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error).toBe('Validation failed')
      expect(json.fields).toBeDefined()
    })

    it('inserts with church_id from profile', async () => {
      const { supabase } = await setupAuth('super_admin', 'church-1')

      // Configure insert chain to return success
      supabase._chain.single.mockResolvedValue({
        data: { id: 'new-account-1', ...validBody },
        error: null,
      })

      const { POST } = await import('../route')
      const req = makeReq(BASE_URL, 'POST', validBody)
      const res = await POST(req)

      expect(res.status).toBe(201)

      // Verify insert was called with church_id
      const insertCalls = supabase._chain.insert.mock.calls as Record<string, unknown>[][]
      expect(insertCalls.length).toBeGreaterThanOrEqual(1)
      const insertedData = insertCalls[0][0] as Record<string, unknown>
      expect(insertedData.church_id).toBe('church-1')
    })

    it('revalidates dashboard cache on success', async () => {
      const { supabase } = await setupAuth('super_admin', 'church-1')

      supabase._chain.single.mockResolvedValue({
        data: { id: 'new-account-1', ...validBody },
        error: null,
      })

      const { POST } = await import('../route')
      const req = makeReq(BASE_URL, 'POST', validBody)
      await POST(req)

      expect(revalidateTag).toHaveBeenCalledWith('dashboard-church-1')
      expect(revalidateTag).toHaveBeenCalledWith('accounts-church-1')
    })
  })
})
