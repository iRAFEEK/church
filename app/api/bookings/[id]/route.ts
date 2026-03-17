import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateBookingSchema } from '@/lib/schemas/location'
import { logger } from '@/lib/logger'

// GET /api/bookings/[id] — get single booking
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, location_id, booked_by, title, title_ar, starts_at, ends_at, status, notes, is_public, created_at, location:locations!location_id(id, name, name_ar), booker:profiles!booked_by(id, first_name, last_name, first_name_ar, last_name_ar)'
    )
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

// PATCH /api/bookings/[id] — update booking (own booking or super_admin)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateBookingSchema, await req.json())

  // Fetch existing booking to check ownership
  const { data: existing, error: fetchError } = await supabase
    .from('bookings')
    .select('id, booked_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (fetchError && fetchError.code === 'PGRST116') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (fetchError) throw fetchError
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  // Only the booker or super_admin can update
  if (profile.role !== 'super_admin' && existing.booked_by !== profile.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Strip is_public from non-super_admin
  const updateData = { ...body }
  if (profile.role !== 'super_admin') {
    delete updateData.is_public
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, location_id, booked_by, title, title_ar, starts_at, ends_at, status, notes, is_public, created_at')
    .single()

  if (error) {
    // PostgreSQL exclusion constraint violation — time slot conflict
    if (error.code === '23P01') {
      return NextResponse.json(
        { error: 'conflict', message: 'This time slot is already booked' },
        { status: 409 }
      )
    }
    logger.error('Booking update failed', {
      module: 'bookings',
      churchId: profile.church_id,
      error,
    })
    throw error
  }

  revalidateTag(`bookings-${profile.church_id}`)
  revalidateTag(`bookings-today-${profile.church_id}`)
  return { data }
})
