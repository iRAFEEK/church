import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)

  const { data, error } = await supabase
    .from('donations')
    .select(`*, donor:donor_id (id, first_name, last_name, first_name_ar, last_name_ar, photo_url), fund:fund_id (id, name, name_ar), campaign:campaign_id (id, name, name_ar)`)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Allow donors to see own donation; others need can_view_finances
  if (data.donor_id !== user.id && !perms.can_view_finances) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_donations) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('donations')
    .update(body)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('donations').delete().eq('id', id).eq('church_id', profile.church_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ success: true })
}
