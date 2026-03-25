import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceMemberBulkSchema } from '@/lib/schemas/conference-member'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

// POST /api/events/[id]/conference/teams/[teamId]/members/bulk — bulk assign volunteers
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId
  const body = validate(conferenceMemberBulkSchema, await req.json())

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

  // Find already-assigned profiles
  const { data: existing } = await supabase
    .from('conference_team_members')
    .select('profile_id')
    .eq('team_id', teamId)
    .eq('church_id', profile.church_id)
    .in('profile_id', body.profile_ids)

  const alreadyAssigned = new Set((existing || []).map((r: { profile_id: string }) => r.profile_id))
  const toInsert = body.profile_ids.filter((pid) => !alreadyAssigned.has(pid))

  if (toInsert.length === 0) {
    return { assigned: 0, skipped_duplicates: body.profile_ids.length }
  }

  const rows = toInsert.map((profileId) => ({
    profile_id: profileId,
    role: body.role,
    shift_start: body.shift_start ?? null,
    shift_end: body.shift_end ?? null,
    team_id: teamId,
    event_id: eventId,
    church_id: profile.church_id,
    assigned_by: user.id,
  }))

  const { error } = await supabase
    .from('conference_team_members')
    .insert(rows)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)

  // Send notifications asynchronously — do not await
  const teamName = team.name_ar || team.name
  ;(async () => {
    const NOTIF_BATCH = 10
    for (let i = 0; i < toInsert.length; i += NOTIF_BATCH) {
      const batch = toInsert.slice(i, i + NOTIF_BATCH)
      await Promise.allSettled(
        batch.map((profileId) =>
          sendNotification({
            profileId,
            churchId: profile.church_id,
            type: 'conference_team_assigned',
            titleEn: 'Conference Team Assignment',
            titleAr: 'تكليف فريق المؤتمر',
            bodyEn: `You've been assigned to the conference team: ${team.name}`,
            bodyAr: `تم تكليفك بفريق المؤتمر: ${teamName}`,
            referenceId: teamId,
            referenceType: 'conference_team',
            data: { url: `/conference/${eventId}/my-team` },
          })
        )
      )
    }
  })().catch((err) =>
    logger.error('Bulk conference assignment notifications failed', {
      module: 'conference',
      churchId: profile.church_id,
      error: err,
    })
  )

  return { assigned: toInsert.length, skipped_duplicates: alreadyAssigned.size }
}, { requirePermissions: ['can_manage_conference'] })
