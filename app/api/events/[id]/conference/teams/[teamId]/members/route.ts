import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceMemberSchema } from '@/lib/schemas/conference-member'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

const PAGE_SIZE = 25

// GET /api/events/[id]/conference/teams/[teamId]/members — paginated member list with profile info
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const offset = (page - 1) * PAGE_SIZE

  // Verify team belongs to this event + church
  const { data: team } = await supabase
    .from('conference_teams')
    .select('id')
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { data, error, count } = await supabase
    .from('conference_team_members')
    .select(
      `id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end,
       checkin_status, checked_in_at, checked_out_at, checked_in_by, task_notes, assigned_by, created_at, updated_at,
       profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone)`,
      { count: 'exact' }
    )
    .eq('team_id', teamId)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) throw error

  return {
    data,
    count,
    page,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// POST /api/events/[id]/conference/teams/[teamId]/members — assign single volunteer
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId
  const body = validate(conferenceMemberSchema, await req.json())

  // Verify team belongs to this event + church
  const { data: team } = await supabase
    .from('conference_teams')
    .select('id, name, name_ar')
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('conference_team_members')
    .insert({
      profile_id: body.profile_id,
      role: body.role,
      shift_start: body.shift_start ?? null,
      shift_end: body.shift_end ?? null,
      team_id: teamId,
      event_id: eventId,
      church_id: profile.church_id,
      assigned_by: user.id,
    })
    .select('id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, checked_out_at, assigned_by, task_notes, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Profile is already assigned to this team' }, { status: 409 })
    }
    throw error
  }

  revalidateTag(`conference-dashboard-${eventId}`)

  // Send notification asynchronously
  const teamName = team.name_ar || team.name
  sendNotification({
    profileId: body.profile_id,
    churchId: profile.church_id,
    type: 'conference_team_assigned',
    titleEn: 'Conference Team Assignment',
    titleAr: 'تكليف فريق المؤتمر',
    bodyEn: `You've been assigned to the conference team: ${team.name}`,
    bodyAr: `تم تكليفك بفريق المؤتمر: ${teamName}`,
    referenceId: teamId,
    referenceType: 'conference_team',
    data: { url: `/conference/${eventId}/my-team` },
  }).catch((err) =>
    logger.error('Conference team assignment notification failed', {
      module: 'conference',
      churchId: profile.church_id,
      error: err,
    })
  )

  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference_teams'] })
