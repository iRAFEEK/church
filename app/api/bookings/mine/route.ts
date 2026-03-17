import { apiHandler } from '@/lib/api/handler'

// GET /api/bookings/mine — list current user's bookings
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'upcoming'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const now = new Date().toISOString()

  let query = supabase
    .from('bookings')
    .select(
      'id, location_id, title, title_ar, starts_at, ends_at, status, notes, is_public, created_at, location:locations!location_id(id, name, name_ar)',
      { count: 'exact' }
    )
    .eq('booked_by', profile.id)
    .eq('church_id', profile.church_id)
    .range(from, to)

  if (filter === 'upcoming') {
    query = query
      .gte('starts_at', now)
      .eq('status', 'confirmed')
      .order('starts_at', { ascending: true })
  } else {
    // past: started before now OR cancelled
    query = query
      .or(`starts_at.lt.${now},status.eq.cancelled`)
      .order('starts_at', { ascending: false })
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, page, pageSize }
})
