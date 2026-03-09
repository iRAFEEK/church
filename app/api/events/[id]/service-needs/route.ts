import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyEventServiceRequest } from '@/lib/messaging/triggers'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/events/[id]/service-needs — list service needs with assignment counts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: needs, error } = await supabase
    .from('event_service_needs')
    .select(`
      *,
      ministry:ministry_id(id, name, name_ar, leader_id),
      group:group_id(id, name, name_ar, leader_id, co_leader_id),
      event_service_assignments(
        id, profile_id, status, assigned_by, notes, role, role_ar, created_at,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone)
      )
    `)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with assignment counts
  const enriched = (needs || []).map((need: any) => ({
    ...need,
    assignments: need.event_service_assignments || [],
    assigned_count: (need.event_service_assignments || []).filter(
      (a: any) => a.status !== 'declined'
    ).length,
    event_service_assignments: undefined,
  }))

  return NextResponse.json({ data: enriched })
}

// PUT /api/events/[id]/service-needs — replace all service needs (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
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
  if (!perms.can_manage_events) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { needs } = await req.json()
  if (!Array.isArray(needs)) {
    return NextResponse.json({ error: 'needs must be an array' }, { status: 400 })
  }

  // Get existing needs for diffing
  const { data: existing } = await supabase
    .from('event_service_needs')
    .select('id, ministry_id, group_id')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  const existingMap = new Map(
    (existing || []).map((e: any) => [
      e.ministry_id ? `m:${e.ministry_id}` : `g:${e.group_id}`,
      e.id,
    ])
  )

  // Determine which needs are new (for notifications)
  const newNeedKeys = new Set<string>()
  const incomingKeys = new Set<string>()

  for (const need of needs) {
    const key = need.ministry_id ? `m:${need.ministry_id}` : `g:${need.group_id}`
    incomingKeys.add(key)
    if (!existingMap.has(key)) {
      newNeedKeys.add(key)
    }
  }

  // Delete needs that are no longer in the list
  const toDelete = (existing || []).filter((e: any) => {
    const key = e.ministry_id ? `m:${e.ministry_id}` : `g:${e.group_id}`
    return !incomingKeys.has(key)
  })

  if (toDelete.length > 0) {
    await supabase
      .from('event_service_needs')
      .delete()
      .in('id', toDelete.map((d: any) => d.id))
  }

  // Upsert remaining needs
  const upsertData = needs.map((need: any) => {
    const key = need.ministry_id ? `m:${need.ministry_id}` : `g:${need.group_id}`
    const existingId = existingMap.get(key)
    return {
      ...(existingId ? { id: existingId } : {}),
      event_id: eventId,
      church_id: profile.church_id,
      ministry_id: need.ministry_id || null,
      group_id: need.group_id || null,
      volunteers_needed: need.volunteers_needed || 1,
      notes: need.notes || null,
      notes_ar: need.notes_ar || null,
    }
  })

  if (upsertData.length > 0) {
    const { error } = await supabase
      .from('event_service_needs')
      .upsert(upsertData)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send notifications for newly added needs (fire-and-forget)
  if (newNeedKeys.size > 0) {
    // Re-fetch to get the IDs of the newly inserted needs
    const { data: allNeeds } = await supabase
      .from('event_service_needs')
      .select('id, ministry_id, group_id')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)

    for (const need of allNeeds || []) {
      const key = need.ministry_id ? `m:${need.ministry_id}` : `g:${need.group_id}`
      if (newNeedKeys.has(key)) {
        notifyEventServiceRequest(eventId, need.id, profile.church_id).catch(console.error)
      }
    }
  }

  return NextResponse.json({ success: true })
}
