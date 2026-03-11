import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/profiles — list members (admin only, paginated)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's profile + role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!['ministry_leader', 'super_admin'].includes(currentProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Pagination
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '25'), 100)
  const offset = (page - 1) * pageSize

  // Filters
  const search = searchParams.get('q')
  const role = searchParams.get('role')
  const status = searchParams.get('status')

  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, status, gender, photo_url, joined_church_at, created_at', { count: 'exact' })
    .eq('church_id', currentProfile.church_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    const { normalizeSearch } = await import('@/lib/utils/search')
    const normalized = normalizeSearch(search)
    const base = `first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    const extra = normalized !== search
      ? `,first_name_ar.ilike.%${normalized}%,last_name_ar.ilike.%${normalized}%,first_name.ilike.%${normalized}%,last_name.ilike.%${normalized}%`
      : ''
    query = query.or(base + extra)
  }
  if (role) query = query.eq('role', role)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}
