import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/events/[id] — get event detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('events')
    .select('*, event_visibility_targets(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[/api/events/[id] GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data })
}

// PATCH /api/events/[id] — update event (admin only)
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
  if (!perms.can_manage_events) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { visibility_targets, ...eventData } = body

  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[/api/events/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Update visibility targets
  if (visibility_targets !== undefined) {
    await supabase.from('event_visibility_targets').delete().eq('event_id', id)
    if (visibility_targets.length > 0) {
      await supabase.from('event_visibility_targets').insert(
        visibility_targets.map((t: { target_type: string; target_id: string }) => ({
          event_id: id,
          target_type: t.target_type,
          target_id: t.target_id,
        }))
      )
    }
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}

// DELETE /api/events/[id] — delete event (admin only)
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
  if (!perms.can_manage_events) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[/api/events/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ success: true })
}
