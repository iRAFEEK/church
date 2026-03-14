import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
import { validate } from '@/lib/api/validate'
import { CreateCampaignSchema } from '@/lib/schemas/campaign'

// GET /api/finance/campaigns
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const status = searchParams.get('status')
  const publicOnly = searchParams.get('public') === 'true'

  let query = supabase
    .from('campaigns')
    .select('id, name, name_ar, description, description_ar, goal_amount, current_amount, currency, start_date, end_date, status, is_public, image_url, created_at, fund:fund_id (id, name, name_ar)', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (publicOnly) query = query.eq('is_public', true)

  const { data, error, count } = await query
  if (error) {
    logger.error('[/api/finance/campaigns GET]', { module: 'finance', error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  return Response.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/campaigns
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateCampaignSchema, body)

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name: validated.name,
      name_ar: validated.name_ar,
      description: validated.description,
      description_ar: validated.description_ar,
      goal_amount: validated.goal_amount,
      currency: validated.currency,
      fund_id: validated.fund_id,
      start_date: validated.start_date,
      end_date: validated.end_date,
      is_public: validated.is_public,
      status: validated.status,
      image_url: validated.image_url,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select('id, name, name_ar, goal_amount, current_amount, currency, start_date, end_date, status, is_public, created_at')
    .single()

  if (error) {
    logger.error('[/api/finance/campaigns POST]', { module: 'finance', error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_campaigns'] })
