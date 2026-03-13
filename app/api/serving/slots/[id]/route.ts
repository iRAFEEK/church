import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/serving/slots/[id] — slot detail with signups
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id, permissions')
    .eq('id', user.id)
    .single()

  const perms = profile ? await resolveApiPermissions(supabase, profile) : null
  const isAdmin = perms?.can_manage_serving

  const { data, error } = await supabase
    .from('serving_slots')
    .select('*, serving_areas(name, name_ar), serving_signups(id, profile_id, status, signed_up_at, profiles(first_name, last_name, first_name_ar, last_name_ar, phone))')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[/api/serving/slots/[id] GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Non-admins only see their own signup status
  if (!isAdmin) {
    data.serving_signups = data.serving_signups?.filter(
      (s: any) => s.profile_id === user.id
    )
  }

  return NextResponse.json({ data })
}

// PATCH /api/serving/slots/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_serving) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('serving_slots')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[/api/serving/slots/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE /api/serving/slots/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_serving) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('serving_slots')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[/api/serving/slots/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
