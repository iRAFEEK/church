import { NextResponse } from 'next/server'
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

  if (error) {
    console.error('[/api/finance/funds/[id] GET]', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/funds/[id]
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateFundSchema, body)

  if (validated.is_default) {
    await supabase
      .from('funds')
      .update({ is_default: false })
      .eq('church_id', profile.church_id)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('funds')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order, currency')
    .single()

  if (error) {
    console.error('[/api/finance/funds/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}, { requirePermissions: ['can_manage_finances'] })

// DELETE /api/finance/funds/[id] — soft delete
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('funds')
    .update({ is_active: false })
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('[/api/finance/funds/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ success: true })
}, { requirePermissions: ['can_manage_finances'] })
