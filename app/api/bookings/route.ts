import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateBookingSchema } from '@/lib/schemas/location'
import { logger } from '@/lib/logger'

// GET /api/bookings — list bookings
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get('location_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const bookedBy = searchParams.get('booked_by')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('bookings')
    .select(
      'id, location_id, booked_by, title, title_ar, starts_at, ends_at, status, notes, is_public, created_at, location:locations!location_id(id, name, name_ar), booker:profiles!booked_by(id, first_name, last_name, first_name_ar, last_name_ar)',
      { count: 'exact' }
    )
    .eq('church_id', profile.church_id)
    .eq('status', 'confirmed')
    .order('starts_at', { ascending: true })
    .range(from, to)

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  if (bookedBy) {
    query = query.eq('booked_by', bookedBy)
  }

  // Overlap filter: bookings that overlap with the date range
  if (startDate && endDate) {
    query = query.lt('starts_at', endDate).gt('ends_at', startDate)
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, page, pageSize }
})

// POST /api/bookings — create booking
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateBookingSchema, body)

  // Only super_admin can set is_public = true
  const isPublic = profile.role === 'super_admin' ? (validated.is_public ?? false) : false

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      location_id: validated.location_id,
      title: validated.title,
      title_ar: validated.title_ar ?? null,
      starts_at: validated.starts_at,
      ends_at: validated.ends_at,
      notes: validated.notes ?? null,
      is_public: isPublic,
      church_id: profile.church_id,
      booked_by: profile.id,
    })
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
    logger.error('Booking creation failed', {
      module: 'bookings',
      churchId: profile.church_id,
      error,
    })
    throw error
  }

  revalidateTag(`bookings-${profile.church_id}`)
  revalidateTag(`bookings-today-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requirePermissions: ['can_book_locations'] })
