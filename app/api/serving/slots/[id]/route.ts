import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateServingSlotSchema } from '@/lib/schemas/serving'

// GET /api/serving/slots/[id] — slot detail with signups
export const GET = apiHandler(async ({ supabase, user, profile, resolvedPermissions, params }) => {
  const id = params!.id
  const isAdmin = resolvedPermissions.can_manage_serving

  const { data, error } = await supabase
    .from('serving_slots')
    .select('id, serving_area_id, title, title_ar, date, start_time, end_time, max_volunteers, notes, notes_ar, church_id, created_at, serving_areas(name, name_ar), serving_signups(id, profile_id, status, signed_up_at, profiles(first_name, last_name, first_name_ar, last_name_ar, phone))')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Non-admins only see their own signup status
  const signups = isAdmin
    ? data.serving_signups
    : (data.serving_signups ?? []).filter(
        (s: Record<string, unknown>) => s.profile_id === user.id
      )

  return { data: { ...data, serving_signups: signups } }
})

// PATCH /api/serving/slots/[id] — update slot (admin only)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateServingSlotSchema, body)

  const { data, error } = await supabase
    .from('serving_slots')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, serving_area_id, title, title_ar, date, start_time, end_time, max_volunteers, notes, notes_ar, church_id, created_at')
    .single()

  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error

  return { data }
}, { requirePermissions: ['can_manage_serving'] })

// DELETE /api/serving/slots/[id] — delete slot (admin only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error, count } = await supabase
    .from('serving_slots')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return { success: true }
}, { requirePermissions: ['can_manage_serving'] })
