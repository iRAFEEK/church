import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/events — list events for user's church
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

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
      return NextResponse.json({ data: [], count: 0, nextCursor: null, page, pageSize, totalPages: 0 })
    }
  }

  let query = supabase
    .from('events')
    .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, status, registration_required, created_at', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('starts_at', { ascending })

  if (status) query = query.eq('status', status)
  if (upcoming) query = query.gte('starts_at', new Date().toISOString())
  if (search) query = query.or(`title.ilike.%${search}%,title_ar.ilike.%${search}%`)
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nextCursor = data && data.length === pageSize
    ? data[data.length - 1].starts_at
    : null

  return NextResponse.json({
    data,
    count,
    nextCursor,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}

// POST /api/events — create new event (admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_events) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { visibility_targets, ...eventData } = body

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...eventData,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save visibility targets if restricted
  if (data && visibility_targets && visibility_targets.length > 0) {
    await supabase.from('event_visibility_targets').insert(
      visibility_targets.map((t: { target_type: string; target_id: string }) => ({
        event_id: data.id,
        target_type: t.target_type,
        target_id: t.target_id,
      }))
    )
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}
