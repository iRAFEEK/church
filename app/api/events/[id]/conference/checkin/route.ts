import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceCheckinSchema } from '@/lib/schemas/conference-member'

// POST /api/events/[id]/conference/checkin — admin/leader check-in a volunteer
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceCheckinSchema, await req.json())

  // Verify caller has permission: must have can_manage_conference_teams OR be a team_leader in the volunteer's team
  const isAdmin = profile.role === 'super_admin' || profile.role === 'ministry_leader'

  if (!isAdmin) {
    // Check if caller is a team_leader or higher in any team for this event
    const { data: callerMembership } = await supabase
      .from('conference_team_members')
      .select('role, team_id')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .eq('profile_id', user.id)
      .in('role', ['team_leader', 'sub_leader', 'area_director', 'conference_director'])
      .limit(1)
      .single()

    if (!callerMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Find the member record for the profile being checked in
  const { data: member } = await supabase
    .from('conference_team_members')
    .select('id, team_id')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .eq('profile_id', body.profile_id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Volunteer not found in this event' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    checkin_status: body.status,
    checked_in_by: user.id,
  }
  if (body.status === 'checked_in') {
    updatePayload.checked_in_at = now
  } else if (body.status === 'checked_out') {
    updatePayload.checked_out_at = now
  }

  const { data, error } = await supabase
    .from('conference_team_members')
    .update(updatePayload)
    .eq('id', member.id)
    .eq('church_id', profile.church_id)
    .select('id, profile_id, team_id, checkin_status, checked_in_at, checked_out_at, checked_in_by, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
})
