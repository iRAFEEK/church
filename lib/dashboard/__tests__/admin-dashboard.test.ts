import { describe, it, expect, vi } from 'vitest'
import { fetchAdminDashboard } from '@/lib/dashboard/admin-dashboard'

// ---------------------------------------------------------------------------
// Mock Supabase factory — per-call chains so a resolver can return
// table/select-specific rows.
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown[] | null; count: number | null; error: null }

function makeSupabase(
  resolver?: (table: string, select: string) => QueryResult | undefined
) {
  const orderCalls: Array<{ table: string; column: string }> = []
  const from = vi.fn((table: string) => {
    let selectArg = ''
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    const methods = [
      'select', 'eq', 'neq', 'gte', 'lte', 'gt', 'lt',
      'in', 'or', 'not', 'is', 'order', 'limit', 'range',
      'single', 'maybeSingle',
    ]
    for (const m of methods) {
      chain[m] = vi.fn().mockImplementation((...args: unknown[]) => {
        if (m === 'select') selectArg = String(args[0])
        if (m === 'order') orderCalls.push({ table, column: String(args[0]) })
        const result: QueryResult =
          resolver?.(table, selectArg) ?? { data: [], count: 0, error: null }
        const p = Promise.resolve(result)
        return Object.assign(p, chain)
      })
    }
    return chain
  })
  return { from, rpc: vi.fn().mockResolvedValue({ data: null, error: null }), _orderCalls: orderCalls }
}

const CHURCH_ID = 'church-1'
const PROFILE_ID = 'profile-1'
const DAY_MS = 24 * 60 * 60 * 1000

describe('fetchAdminDashboard (lib/dashboard/admin-dashboard.ts)', () => {
  it('returns correct empty structure and four pipeline statuses', async () => {
    const sb = makeSupabase()
    const result = await fetchAdminDashboard(sb as never, PROFILE_ID, CHURCH_ID)

    expect(result.attentionItems).toEqual([])
    expect(result.visitorPipeline.map(p => p.status)).toEqual([
      'new', 'assigned', 'contacted', 'converted',
    ])
  })

  it('emits one structured attention item per overdue visitor, longest waiting first, with deep-link href', async () => {
    const now = Date.now()
    const sb = makeSupabase((table, select) => {
      if (table === 'visitors' && select.includes('assigned_to')) {
        return {
          data: [
            // Query orders by visited_at ascending → oldest (most urgent) first
            { id: 'v1', first_name: 'Mina', last_name: 'Samir', visited_at: new Date(now - 5 * DAY_MS - 1000).toISOString(), assigned_to: null },
            { id: 'v2', first_name: 'Sara', last_name: 'Adel', visited_at: new Date(now - 3 * DAY_MS - 1000).toISOString(), assigned_to: 'leader-1' },
          ],
          count: 2,
          error: null,
        }
      }
      return undefined
    })

    const result = await fetchAdminDashboard(sb as never, PROFILE_ID, CHURCH_ID)
    const visitorItems = result.attentionItems.filter(i => i.type === 'visitor_sla')

    expect(visitorItems).toHaveLength(2)
    expect(visitorItems[0]).toMatchObject({
      type: 'visitor_sla',
      id: 'v1',
      name: 'Mina Samir',
      params: { days: 5, noLeader: true },
      href: '/admin/visitors?visitor=v1',
    })
    expect(visitorItems[1]).toMatchObject({
      id: 'v2',
      name: 'Sara Adel',
      params: { days: 3, noLeader: false },
      href: '/admin/visitors?visitor=v2',
    })
    // No hardcoded English copy in the data layer
    expect(visitorItems[0].sublabel).toBe('')
  })

  it('orders the SLA visitor query by visited_at (longest waiting first)', async () => {
    const sb = makeSupabase()
    await fetchAdminDashboard(sb as never, PROFILE_ID, CHURCH_ID)

    expect(
      sb._orderCalls.some(c => c.table === 'visitors' && c.column === 'visited_at')
    ).toBe(true)
  })

  it('emits structured params for unfilled slots and aggregate items', async () => {
    const sb = makeSupabase((table, select) => {
      if (table === 'serving_slots' && select.includes('serving_signups')) {
        return {
          data: [
            {
              id: 's1', title: 'Ushering', title_ar: 'الاستقبال', max_volunteers: 4,
              serving_signups: [{ id: 'x', status: 'confirmed' }, { id: 'y', status: 'cancelled' }],
            },
          ],
          count: 1,
          error: null,
        }
      }
      if (table === 'prayer_requests') return { data: [], count: 7, error: null }
      if (table === 'outreach_visits') return { data: [], count: 2, error: null }
      return undefined
    })

    const result = await fetchAdminDashboard(sb as never, PROFILE_ID, CHURCH_ID)

    const slot = result.attentionItems.find(i => i.type === 'unfilled_slot')
    expect(slot).toMatchObject({
      id: 's1',
      name: 'Ushering',
      nameAr: 'الاستقبال',
      params: { filled: 1, needed: 4 },
    })

    const prayer = result.attentionItems.find(i => i.type === 'active_prayer')
    expect(prayer).toMatchObject({ params: { count: 7 }, href: '/admin/prayers' })

    const outreach = result.attentionItems.find(i => i.type === 'outreach_followup')
    expect(outreach).toMatchObject({ params: { count: 2 }, href: '/admin/outreach' })
  })

  it('filters by church_id on the visitors queries', async () => {
    const eqCalls: Array<[string, string]> = []
    const sb = makeSupabase()
    const origFrom = sb.from
    sb.from = vi.fn((table: string) => {
      const chain = origFrom(table)
      const origEq = chain.eq
      chain.eq = vi.fn((...args: unknown[]) => {
        if (table === 'visitors') eqCalls.push([String(args[0]), String(args[1])])
        return origEq(...args)
      })
      return chain
    }) as typeof origFrom

    await fetchAdminDashboard(sb as never, PROFILE_ID, CHURCH_ID)
    expect(eqCalls.filter(([col, val]) => col === 'church_id' && val === CHURCH_ID).length).toBeGreaterThanOrEqual(3)
  })
})
