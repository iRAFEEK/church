import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceBroadcastSchema } from '@/lib/schemas/conference-broadcast'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

const PAGE_SIZE = 25
const BATCH_SIZE = 10

// GET /api/events/[id]/conference/broadcasts — paginated broadcast history
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const areaId = searchParams.get('area_id')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('conference_broadcasts')
    .select(
      `id, church_id, event_id, team_id, area_id, sent_by, message, message_ar, is_urgent, created_at,
       sender:sent_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)`,
      { count: 'exact' }
    )
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (teamId) query = query.eq('team_id', teamId)
  if (areaId) query = query.eq('area_id', areaId)

  const { data, error, count } = await query
  if (error) throw error

  return {
    data,
    count,
    page,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// POST /api/events/[id]/conference/broadcasts — send broadcast
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceBroadcastSchema, await req.json())

  // Write broadcast record
  const { data: broadcast, error: insertError } = await supabase
    .from('conference_broadcasts')
    .insert({
      event_id: eventId,
      church_id: profile.church_id,
      sent_by: user.id,
      message: body.message,
      message_ar: body.message_ar ?? null,
      is_urgent: body.is_urgent,
      team_id: body.team_id ?? null,
      area_id: body.area_id ?? null,
    })
    .select('id, event_id, team_id, area_id, message, message_ar, is_urgent, created_at')
    .single()

  if (insertError || !broadcast) throw insertError

  // Resolve audience: team members, area members, or all event volunteers
  let audienceQuery = supabase
    .from('conference_team_members')
    .select('profile_id')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (body.team_id) {
    audienceQuery = audienceQuery.eq('team_id', body.team_id)
  } else if (body.area_id) {
    // Get all teams in the area
    const { data: areaTeams } = await supabase
      .from('conference_teams')
      .select('id')
      .eq('area_id', body.area_id)
      .eq('church_id', profile.church_id)

    const teamIds = (areaTeams || []).map((t: { id: string }) => t.id)
    if (teamIds.length > 0) {
      audienceQuery = audienceQuery.in('team_id', teamIds)
    }
  }

  const { data: audienceRows } = await audienceQuery
  const profileIds = [...new Set((audienceRows || []).map((r: { profile_id: string }) => r.profile_id))]

  let sentToCount = 0

  // Dispatch push + in_app notifications in batches
  ;(async () => {
    for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
      const batch = profileIds.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((profileId: string) =>
          sendNotification({
            profileId,
            churchId: profile.church_id,
            type: 'conference_broadcast',
            titleEn: body.is_urgent ? 'Urgent Broadcast' : 'Conference Broadcast',
            titleAr: body.is_urgent ? 'بث عاجل' : 'بث المؤتمر',
            bodyEn: body.message,
            bodyAr: body.message_ar || body.message,
            referenceId: broadcast.id,
            referenceType: 'conference_broadcast',
            data: { url: `/conference/${eventId}` },
          })
        )
      )
      sentToCount += results.filter((r) => r.status === 'fulfilled').length
    }
  })().catch((err) =>
    logger.error('Conference broadcast notification dispatch failed', {
      module: 'conference',
      churchId: profile.church_id,
      error: err,
    })
  )

  revalidateTag(`conference-dashboard-${eventId}`)

  return NextResponse.json(
    { data: broadcast, sent_to_count: profileIds.length },
    { status: 201 }
  )
}, { requirePermissions: ['can_manage_conference'] })
