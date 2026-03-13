import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/outreach/visits/[id] — update a visit
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
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
  if (!perms.can_manage_outreach) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, any> = {}

  if (body.visit_date !== undefined) updates.visit_date = body.visit_date
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.needs_followup !== undefined) updates.needs_followup = body.needs_followup
  if (body.followup_date !== undefined) updates.followup_date = body.followup_date
  if (body.followup_notes !== undefined) updates.followup_notes = body.followup_notes

  const { data, error } = await supabase
    .from('outreach_visits')
    .update(updates)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) {
    console.error('[/api/outreach/visits/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE /api/outreach/visits/[id] — delete a visit
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
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
  if (!perms.can_manage_outreach) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('outreach_visits')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('[/api/outreach/visits/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
