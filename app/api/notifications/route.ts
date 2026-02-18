import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications — get current user's notifications (paginated)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const unreadOnly = searchParams.get('unread') === 'true'
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('notifications_log')
    .select('*', { count: 'exact' })
    .eq('profile_id', user.id)
    .eq('channel', 'in_app')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also get unread count
  const { count: unreadCount } = await supabase
    .from('notifications_log')
    .select('*', { count: 'exact', head: true })
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
}
