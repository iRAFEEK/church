import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateServingAreaSchema } from '@/lib/schemas/serving'

// GET /api/serving/areas/[id] — area detail
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('serving_areas')
    .select('id, name, name_ar, description, description_ar, ministry_id, is_active, created_at, ministries(name, name_ar)')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error

  return { data }
})

// PATCH /api/serving/areas/[id] — update area (admin only)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateServingAreaSchema, body)

  const { data, error } = await supabase
    .from('serving_areas')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, description, description_ar, ministry_id, is_active, created_at')
    .single()

  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error

  revalidateTag(`serving-areas-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_serving'] })

// DELETE /api/serving/areas/[id] — delete area (admin only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error, count } = await supabase
    .from('serving_areas')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  revalidateTag(`serving-areas-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_serving'] })
