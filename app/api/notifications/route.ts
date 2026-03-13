import { apiHandler } from '@/lib/api/handler'
import { NextResponse } from 'next/server'

// GET /api/notifications — get current user's notifications (paginated)
export const GET = apiHandler(async ({ req, supabase, user }) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const unreadOnly = searchParams.get('unread') === 'true'
  const typeFilter = searchParams.get('type')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('notifications_log')
    .select('id, type, channel, title, body, payload, status, read_at, reference_id, reference_type, sent_at, created_at', { count: 'exact' })
    .eq('profile_id', user.id)
    .eq('channel', 'in_app')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }
  if (typeFilter) {
    query = query.eq('type', typeFilter)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[/api/notifications GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Also get unread count
  const { count: unreadCount } = await supabase
    .from('notifications_log')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('channel', 'in_app')
    .is('read_at', null)

  return NextResponse.json({
    data,
    count,
    unreadCount: unreadCount || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  })
})
