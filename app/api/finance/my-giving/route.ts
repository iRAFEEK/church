import { apiHandler } from '@/lib/api/handler'

const PAGE_SIZE = 25

export const GET = apiHandler(async ({ req, supabase, user, profile }) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const churchId = profile.church_id

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [donationsRes, monthRes, yearRes, pledgesRes] = await Promise.all([
    supabase
      .from('donations')
      .select('id, amount, base_amount, currency, donation_date, payment_method, receipt_number, is_tithe, fund:fund_id(id, name, name_ar), campaign:campaign_id(id, name, name_ar)', { count: 'exact' })
      .eq('donor_id', user.id)
      .eq('church_id', churchId)
      .order('donation_date', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from('donations')
      .select('base_amount')
      .eq('donor_id', user.id)
      .eq('church_id', churchId)
      .gte('donation_date', startOfMonth)
      .lte('donation_date', today),
    supabase
      .from('donations')
      .select('base_amount')
      .eq('donor_id', user.id)
      .eq('church_id', churchId)
      .gte('donation_date', startOfYear)
      .lte('donation_date', today),
    supabase
      .from('pledges')
      .select('id, total_amount, fulfilled_amount, currency, status, frequency, next_due_date, campaign:campaign_id(id, name, name_ar)')
      .eq('donor_id', user.id)
      .eq('church_id', churchId)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false }),
  ])

  const donations = donationsRes.data ?? []
  const total = donationsRes.count ?? 0
  const pledges = pledgesRes.data ?? []

  const thisMonth = (monthRes.data ?? []).reduce((s, d) => s + (d.base_amount || 0), 0)
  const thisYear = (yearRes.data ?? []).reduce((s, d) => s + (d.base_amount || 0), 0)

  return Response.json({
    data: {
      donations,
      pledges,
      summary: { thisMonth, thisYear },
      total,
      page,
      pageSize: PAGE_SIZE,
      hasMore: total > offset + PAGE_SIZE,
    },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_own_giving'] })
