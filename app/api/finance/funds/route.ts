import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateFundSchema } from '@/lib/schemas/fund'

// GET /api/finance/funds — list funds for user's church
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') !== 'false'

  let query = supabase
    .from('funds')
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error, count } = await query
  if (error) throw error

  return Response.json({ data, count }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/funds — create fund
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateFundSchema, body)

  // If this is set as default, unset the previous default
  if (validated.is_default) {
    await supabase
      .from('funds')
      .update({ is_default: false })
      .eq('church_id', profile.church_id)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('funds')
    .insert({
      name: validated.name,
      name_ar: validated.name_ar,
      code: validated.code,
      description: validated.description,
      description_ar: validated.description_ar,
      target_amount: validated.target_amount,
      color: validated.color,
      currency: validated.currency,
      is_active: validated.is_active,
      is_default: validated.is_default,
      is_restricted: validated.is_restricted,
      display_order: validated.display_order,
      church_id: profile.church_id,
    })
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_finances'] })
