import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'

// POST /api/events/[id]/conference/self-checkin — volunteer self check-in
export const POST = apiHandler(async ({ supabase, user, profile, params }) => {
  const eventId = params!.id

  // Find this user's team member record for the event
  const { data: member } = await supabase
    .from('conference_team_members')
    .select('id, team_id, shift_start, shift_end')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .eq('profile_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'You are not assigned to any team in this event' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_team_members')
    .update({
      checkin_status: 'checked_in',
      checked_in_at: new Date().toISOString(),
      checked_in_by: user.id,
    })
    .eq('id', member.id)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)

  if (error) throw error

  // Fetch team info for response
  const { data: team } = await supabase
    .from('conference_teams')
    .select('name, name_ar, muster_point, muster_point_ar')
    .eq('id', member.team_id)
    .eq('church_id', profile.church_id)
    .single()

  revalidateTag(`conference-dashboard-${eventId}`)

  return {
    data: {
      team_name: team?.name ?? null,
      team_name_ar: team?.name_ar ?? null,
      muster_point: team?.muster_point ?? null,
      muster_point_ar: team?.muster_point_ar ?? null,
      shift_start: member.shift_start,
      shift_end: member.shift_end,
    },
  }
})
