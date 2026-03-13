import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateFundSchema } from '@/lib/schemas/fund'

// GET /api/finance/funds/[id]
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('funds')
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order, currency')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) throw error
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/funds/[id]
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateFundSchema, body)

  // If setting as default, use atomic RPC to switch (unset old + set new in one DB transaction)
  if (validated.is_default) {
    const { error: switchError } = await supabase.rpc('switch_default_fund', {
      p_church_id: profile.church_id,
      p_fund_id: id,
    })
    if (switchError) throw switchError
  }

  // Build explicit update object
  const updateData: Record<string, unknown> = {}
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.name_ar !== undefined) updateData.name_ar = validated.name_ar
  if (validated.code !== undefined) updateData.code = validated.code
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.description_ar !== undefined) updateData.description_ar = validated.description_ar
  if (validated.target_amount !== undefined) updateData.target_amount = validated.target_amount
  if (validated.color !== undefined) updateData.color = validated.color
  if (validated.currency !== undefined) updateData.currency = validated.currency
  if (validated.is_active !== undefined) updateData.is_active = validated.is_active
  if (validated.is_restricted !== undefined) updateData.is_restricted = validated.is_restricted
  if (validated.display_order !== undefined) updateData.display_order = validated.display_order
  // is_default=false handled here (true already handled atomically above)
  if (validated.is_default !== undefined && !validated.is_default) updateData.is_default = false

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('funds')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', profile.church_id)

    if (error) throw error
  }

  // Fetch final state
  const { data, error: fetchError } = await supabase
    .from('funds')
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (fetchError) throw fetchError
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data })
}, { requirePermissions: ['can_manage_finances'] })

// DELETE /api/finance/funds/[id] — soft delete
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('funds')
    .update({ is_active: false })
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ success: true })
}, { requirePermissions: ['can_manage_finances'] })
