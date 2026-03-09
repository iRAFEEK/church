import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/church-prayers/[id] — update prayer status
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
  if (!perms.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, any> = {}

  if (body.status) {
    updates.status = body.status
    if (body.status === 'answered') {
      updates.resolved_at = new Date().toISOString()
    }
  }
  if (body.resolved_notes !== undefined) updates.resolved_notes = body.resolved_notes

  const { data, error } = await supabase
    .from('prayer_requests')
    .update(updates)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/church-prayers/[id] — delete a prayer request
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

  // Allow deletion by the submitter or by someone with can_view_prayers
  const perms = await resolveApiPermissions(supabase, profile)

  // Check if user is the submitter
  const { data: prayer } = await supabase
    .from('prayer_requests')
    .select('submitted_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .single()

  if (!prayer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (prayer.submitted_by !== user.id && !perms.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
