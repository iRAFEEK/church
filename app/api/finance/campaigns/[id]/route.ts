import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateCampaignSchema } from '@/lib/schemas/campaign'

// GET /api/finance/campaigns/[id]
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, name_ar, description, description_ar, goal_amount, current_amount, currency, start_date, end_date, status, is_public, image_url, created_at, fund:fund_id (id, name, name_ar)')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/finance/campaigns/[id] GET]', error)
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/campaigns/[id]
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateCampaignSchema, body)

  // Build explicit update object
  const updateData: Record<string, unknown> = {}
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.name_ar !== undefined) updateData.name_ar = validated.name_ar
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.description_ar !== undefined) updateData.description_ar = validated.description_ar
  if (validated.goal_amount !== undefined) updateData.goal_amount = validated.goal_amount
  if (validated.currency !== undefined) updateData.currency = validated.currency
  if (validated.fund_id !== undefined) updateData.fund_id = validated.fund_id
  if (validated.start_date !== undefined) updateData.start_date = validated.start_date
  if (validated.end_date !== undefined) updateData.end_date = validated.end_date
  if (validated.is_public !== undefined) updateData.is_public = validated.is_public
  if (validated.status !== undefined) updateData.status = validated.status
  if (validated.image_url !== undefined) updateData.image_url = validated.image_url

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, goal_amount, current_amount, currency, start_date, end_date, status, is_public, created_at')
    .single()

  if (error) {
    console.error('[/api/finance/campaigns/[id] PATCH]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_campaigns'] })
