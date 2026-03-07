import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id, church_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get target profile's church_id
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, church_id')
    .eq('id', targetId)
    .single()

  if (!targetProfile) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (targetProfile.church_id !== currentProfile.church_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // RBAC check
  const role = currentProfile.role
  if (role === 'member' && currentProfile.id !== targetId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (role === 'group_leader' && currentProfile.id !== targetId) {
    // Verify target is in a group the current user leads
    const { data: leaderCheck } = await supabase
      .from('group_members')
      .select('id')
      .eq('profile_id', currentProfile.id)
      .in('role_in_group', ['leader', 'co_leader'])
      .eq('is_active', true)

    if (!leaderCheck || leaderCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leaderGroupIds = leaderCheck.map((g: any) => g.id)

    // Get all groups where leader is leader, then check if target is in any
    const { data: leaderGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('profile_id', currentProfile.id)
      .in('role_in_group', ['leader', 'co_leader'])
      .eq('is_active', true)

    const groupIds = (leaderGroups || []).map((g: any) => g.group_id)

    if (groupIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: memberCheck } = await supabase
      .from('group_members')
      .select('id')
      .eq('profile_id', targetId)
      .in('group_id', groupIds)
      .limit(1)

    if (!memberCheck || memberCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // super_admin and ministry_leader pass through — same church is enough

  const churchId = currentProfile.church_id

  // Run all queries in parallel
  const [
    assignmentsRes,
    signupsRes,
    groupsRes,
    ministriesRes,
    registrationsRes,
  ] = await Promise.all([
    // 1. Event service assignments with event + need details
    supabase
      .from('event_service_assignments')
      .select(`
        id, status, role, role_ar, created_at, status_changed_at,
        service_need:service_need_id(
          volunteers_needed,
          ministry:ministry_id(name, name_ar),
          group:group_id(name, name_ar),
          event:event_id(id, title, title_ar, starts_at, ends_at, location, status)
        )
      `)
      .eq('profile_id', targetId)
      .eq('church_id', churchId)
      .order('created_at', { ascending: false }),

    // 2. Serving signups with slot + area details
    supabase
      .from('serving_signups')
      .select(`
        id, status, signed_up_at, cancelled_at,
        slot:slot_id(
          id, title, title_ar, date, start_time, end_time,
          area:serving_area_id(name, name_ar)
        )
      `)
      .eq('profile_id', targetId)
      .eq('church_id', churchId)
      .order('signed_up_at', { ascending: false }),

    // 3. Group memberships with group details
    supabase
      .from('group_members')
      .select(`
        id, role_in_group, joined_at, is_active,
        group:group_id(id, name, name_ar, type, ministry:ministry_id(name, name_ar))
      `)
      .eq('profile_id', targetId)
      .order('joined_at', { ascending: false }),

    // 4. Ministry memberships
    supabase
      .from('ministry_members')
      .select(`
        id, role_in_ministry, joined_at, is_active,
        ministry:ministry_id(id, name, name_ar)
      `)
      .eq('profile_id', targetId)
      .order('joined_at', { ascending: false }),

    // 5. Event registrations
    supabase
      .from('event_registrations')
      .select(`
        id, status, registered_at, check_in_at,
        event:event_id(id, title, title_ar, starts_at, location)
      `)
      .eq('profile_id', targetId)
      .eq('church_id', churchId)
      .order('registered_at', { ascending: false }),
  ])

  // Flatten service assignments
  const serviceAssignments = (assignmentsRes.data || []).map((a: any) => {
    const need = a.service_need || {}
    const event = need.event || {}
    const ministry = need.ministry
    const group = need.group
    return {
      id: a.id,
      status: a.status,
      role: a.role,
      role_ar: a.role_ar,
      created_at: a.created_at,
      status_changed_at: a.status_changed_at,
      event_id: event.id || '',
      event_title: event.title || '',
      event_title_ar: event.title_ar || null,
      event_starts_at: event.starts_at || '',
      event_ends_at: event.ends_at || null,
      event_location: event.location || null,
      event_status: event.status || '',
      ministry_name: ministry?.name || null,
      ministry_name_ar: ministry?.name_ar || null,
      group_name: group?.name || null,
      group_name_ar: group?.name_ar || null,
    }
  })

  // Flatten serving signups
  const servingSignups = (signupsRes.data || []).map((s: any) => {
    const slot = s.slot || {}
    const area = slot.area
    return {
      id: s.id,
      status: s.status,
      signed_up_at: s.signed_up_at,
      cancelled_at: s.cancelled_at,
      slot_title: slot.title || '',
      slot_title_ar: slot.title_ar || null,
      slot_date: slot.date || '',
      slot_start_time: slot.start_time || null,
      slot_end_time: slot.end_time || null,
      area_name: area?.name || null,
      area_name_ar: area?.name_ar || null,
    }
  })

  // Flatten group memberships
  const groupMemberships = (groupsRes.data || []).map((g: any) => {
    const group = g.group || {}
    const ministry = group.ministry
    return {
      id: g.id,
      role_in_group: g.role_in_group,
      joined_at: g.joined_at,
      is_active: g.is_active,
      group_id: group.id || '',
      group_name: group.name || '',
      group_name_ar: group.name_ar || null,
      group_type: group.type || 'other',
      ministry_name: ministry?.name || null,
      ministry_name_ar: ministry?.name_ar || null,
    }
  })

  // Flatten ministry memberships
  const ministryMemberships = (ministriesRes.data || []).map((m: any) => {
    const ministry = m.ministry || {}
    return {
      id: m.id,
      role_in_ministry: m.role_in_ministry,
      joined_at: m.joined_at,
      is_active: m.is_active,
      ministry_id: ministry.id || '',
      ministry_name: ministry.name || '',
      ministry_name_ar: ministry.name_ar || null,
    }
  })

  // Flatten event registrations
  const eventRegistrations = (registrationsRes.data || []).map((r: any) => {
    const event = r.event || {}
    return {
      id: r.id,
      status: r.status,
      registered_at: r.registered_at,
      check_in_at: r.check_in_at,
      event_id: event.id || '',
      event_title: event.title || '',
      event_title_ar: event.title_ar || null,
      event_starts_at: event.starts_at || '',
      event_location: event.location || null,
    }
  })

  // Compute stats
  const stats = {
    totalEventsServed: serviceAssignments.filter((a: any) => a.status !== 'declined').length,
    totalConfirmed: serviceAssignments.filter((a: any) => a.status === 'confirmed').length,
    totalDeclined: serviceAssignments.filter((a: any) => a.status === 'declined').length,
    totalServingSignups: servingSignups.filter((s: any) => s.status !== 'cancelled').length,
    activeGroups: groupMemberships.filter((g: any) => g.is_active).length,
    activeMinistries: ministryMemberships.filter((m: any) => m.is_active).length,
    eventsRegistered: eventRegistrations.length,
  }

  return NextResponse.json({
    stats,
    serviceAssignments,
    servingSignups,
    groupMemberships,
    ministryMemberships,
    eventRegistrations,
  })
}
