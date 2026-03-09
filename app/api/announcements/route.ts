import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/announcements — list announcements
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '50')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const isAdmin = perms.can_manage_announcements

  let query = supabase
    .from('announcements')
    .select('id, title, title_ar, body, body_ar, status, is_pinned, expires_at, published_at, created_at, created_by', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  } else if (!isAdmin) {
    // Members only see published + not expired
    query = query.eq('status', 'published')
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  })
}

// POST /api/announcements — create announcement (admin only)
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
  if (!perms.can_manage_announcements) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...body,
      church_id: profile.church_id,
      created_by: user.id,
      published_at: body.status === 'published' ? now : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}
