import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateLocationSchema } from '@/lib/schemas/location'

// GET /api/locations — list locations
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const active = searchParams.get('active')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('locations')
    .select('id, name, name_ar, location_type, capacity, features, is_active, notes, notes_ar, created_at', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('name', { ascending: true })
    .range(from, to)

  if (type) {
    query = query.eq('location_type', type)
  }

  if (active !== null && active !== undefined) {
    query = query.eq('is_active', active === 'true')
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) }
}, { requirePermissions: ['can_manage_locations'] })

// POST /api/locations — create location
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateLocationSchema, body)

  const { data, error } = await supabase
    .from('locations')
    .insert({
      ...validated,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select('id, name, name_ar, location_type, capacity, features, is_active, notes, notes_ar, created_at')
    .single()

  if (error) throw error

  revalidateTag(`locations-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_locations'] })
