import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyEventServiceAssigned } from '@/lib/messaging/triggers'
import { resolveApiPermissions } from '@/lib/auth'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string; needId: string }> }

// GET — list assignments for a service need
export async function GET(req: NextRequest, { params }: Params) {
  const { needId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: assignments, error } = await supabase
    .from('event_service_assignments')
    .select(`
      *,
      profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone)
    `)
    .eq('service_need_id', needId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[/api/events/[id]/service-needs/[needId]/assignments GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data: assignments })
}

// POST — assign a member to a service need
export async function POST(req: NextRequest, { params }: Params) {
  const { id: eventId, needId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify the user has event management permission or is leader of the relevant ministry/group
  const perms = await resolveApiPermissions(supabase, profile)
  const isAdmin = perms.can_manage_events

  if (!isAdmin) {
    const { data: need } = await supabase
      .from('event_service_needs')
      .select('ministry_id, group_id')
      .eq('id', needId)
      .single()

    if (!need) return NextResponse.json({ error: 'Service need not found' }, { status: 404 })

    let isLeader = false
    if (need.ministry_id) {
      const { data: ministry } = await supabase
        .from('ministries')
        .select('leader_id')
        .eq('id', need.ministry_id)
        .single()
      isLeader = ministry?.leader_id === user.id
    }
    if (need.group_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('leader_id, co_leader_id')
        .eq('id', need.group_id)
        .single()
      isLeader = group?.leader_id === user.id || group?.co_leader_id === user.id
    }

    if (!isLeader) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { profile_id, notes, role, role_ar } = body

  if (!profile_id) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  const { data: assignment, error } = await supabase
    .from('event_service_assignments')
    .upsert({
      service_need_id: needId,
      church_id: profile.church_id,
      profile_id,
      assigned_by: user.id,
      status: 'assigned',
      notes: notes || null,
      role: role || null,
      role_ar: role_ar || null,
    }, { onConflict: 'service_need_id,profile_id' })
    .select()
    .single()

  if (error) {
    console.error('[/api/events/[id]/service-needs/[needId]/assignments POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Notify the assigned member (fire-and-forget)
  notifyEventServiceAssigned(assignment.id, profile.church_id).catch((err) =>
    logger.error('notifyEventServiceAssigned fire-and-forget failed', { module: 'events', churchId: profile.church_id, error: err })
  )

  return NextResponse.json({ data: assignment }, { status: 201 })
}

// DELETE — remove an assignment
export async function DELETE(req: NextRequest, { params }: Params) {
  const { needId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { assignment_id } = body

  if (!assignment_id) {
    return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('event_service_assignments')
    .delete()
    .eq('id', assignment_id)
    .eq('service_need_id', needId)

  if (error) {
    console.error('[/api/events/[id]/service-needs/[needId]/assignments DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
