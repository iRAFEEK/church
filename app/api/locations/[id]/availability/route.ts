import { apiHandler } from '@/lib/api/handler'

// GET /api/locations/[id]/availability — check booking conflicts for a time range
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const locationId = params!.id
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const exclude = searchParams.get('exclude')

  if (!date || !start || !end) {
    return Response.json(
      { error: 'Missing required params: date, start, end' },
      { status: 400 }
    )
  }

  // Build full ISO timestamps from date + time
  const startsAt = `${date}T${start}:00`
  const endsAt = `${date}T${end}:00`

  // Find confirmed bookings that overlap with the given time range
  // Overlap condition: existing.starts_at < requested.ends_at AND existing.ends_at > requested.starts_at
  let query = supabase
    .from('bookings')
    .select('id, title, title_ar, starts_at, ends_at, booked_by')
    .eq('location_id', locationId)
    .eq('church_id', profile.church_id)
    .eq('status', 'confirmed')
    .lt('starts_at', endsAt)
    .gt('ends_at', startsAt)
    .order('starts_at', { ascending: true })
    .limit(50)

  if (exclude) {
    query = query.neq('id', exclude)
  }

  const { data, error } = await query
  if (error) throw error

  return { conflicts: data, available: !data || data.length === 0 }
})
