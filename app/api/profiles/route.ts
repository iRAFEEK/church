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
    .select('*', { count: 'exact' })
    .eq('church_id', currentProfile.church_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    query = query.or(
      `first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    )
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
  })
}
