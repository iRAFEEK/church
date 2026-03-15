import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateEventSchema } from '@/lib/schemas/event'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/events — list events for user's church
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const upcoming = searchParams.get('upcoming') === 'true'
  const cursor = searchParams.get('cursor')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 50)
  const ascending = upcoming
  const search = searchParams.get('search')
  const ministryId = searchParams.get('ministry_id')
  const groupId = searchParams.get('group_id')

  // If filtering by ministry or group, first get matching event IDs via service_needs
  let eventIdFilter: string[] | null = null
  if (ministryId || groupId) {
    let needsQuery = supabase
      .from('event_service_needs')
      .select('event_id')
      .eq('church_id', profile.church_id)
    if (ministryId) needsQuery = needsQuery.eq('ministry_id', ministryId)
    if (groupId) needsQuery = needsQuery.eq('group_id', groupId)
    const { data: needsData } = await needsQuery
    eventIdFilter = [...new Set((needsData || []).map(n => n.event_id))]
    if (eventIdFilter.length === 0) {
      return { data: [], count: 0, nextCursor: null, page, pageSize, totalPages: 0 }
    }
  }

  let query = supabase
    .from('events')
    .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, status, registration_required, created_at', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('starts_at', { ascending })

  if (status) query = query.eq('status', status)
  if (upcoming) query = query.gte('starts_at', new Date().toISOString())
  if (search) {
    const { normalizeSearch } = await import('@/lib/utils/normalize')
    const escaped = sanitizeLikePattern(search)
    const normalized = normalizeSearch(escaped)
    const parts = [`title.ilike.%${escaped}%`, `title_ar.ilike.%${escaped}%`]
    if (normalized !== escaped) {
      parts.push(`title.ilike.%${normalized}%`, `title_ar.ilike.%${normalized}%`)
    }
    query = query.or(parts.join(','))
  }
  if (eventIdFilter) query = query.in('id', eventIdFilter)

  if (cursor) {
    // Cursor-based pagination
    if (ascending) {
      query = query.gt('starts_at', cursor)
    } else {
      query = query.lt('starts_at', cursor)
    }
    query = query.limit(pageSize)
  } else {
    // Offset-based pagination (backward compatible)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query
  if (error) throw error

  const nextCursor = data && data.length === pageSize
    ? data[data.length - 1].starts_at
    : null

  return {
    data,
    count,
    nextCursor,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
})

// POST /api/events — create new event
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = validate(CreateEventSchema, await req.json())
  const { visibility_targets, ...eventData } = body

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...eventData,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select('id, title, title_ar, event_type, starts_at, ends_at, status, created_at')
    .single()

  if (error) throw error

  // Save visibility targets if restricted
  if (data && visibility_targets && visibility_targets.length > 0) {
    await supabase.from('event_visibility_targets').insert(
      visibility_targets.map((t) => ({
        event_id: data.id,
        target_type: t.target_type,
        target_id: t.target_id,
      }))
    )
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_events'] })
