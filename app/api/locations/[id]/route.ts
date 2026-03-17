import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateLocationSchema } from '@/lib/schemas/location'

// GET /api/locations/[id] — get single location (any authenticated user)
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('locations')
    .select('id, name, name_ar, location_type, capacity, features, is_active, notes, notes_ar, created_at, created_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error && error.code === 'PGRST116') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })

  return { data }
})

// PATCH /api/locations/[id] — update location
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateLocationSchema, await req.json())

  const { data, error } = await supabase
    .from('locations')
    .update(body)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, location_type, capacity, features, is_active, notes, notes_ar, created_at')
    .single()

  if (error && error.code === 'PGRST116') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error

  revalidateTag(`locations-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_locations'] })

// DELETE /api/locations/[id] — soft-delete (set is_active = false)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('locations')
    .update({ is_active: false })
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id')
    .single()

  if (error && error.code === 'PGRST116') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) throw error

  revalidateTag(`locations-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_locations'] })
