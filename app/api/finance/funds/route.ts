import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/finance/funds — list funds for user's church
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
  if (!perms.can_view_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') !== 'false'

  let query = supabase
    .from('funds')
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

// POST /api/finance/funds — create fund
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
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // If this is set as default, unset the previous default
  if (body.is_default) {
    await supabase
      .from('funds')
      .update({ is_default: false })
      .eq('church_id', profile.church_id)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('funds')
    .insert({ ...body, church_id: profile.church_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}
