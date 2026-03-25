import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceBoardCardSchema } from '@/lib/schemas/conference-broadcast'

// POST /api/events/[id]/conference/board/cards — create board card
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceBoardCardSchema, await req.json())

  // Verify column belongs to this event + church (only when column_id provided)
  if (body.column_id) {
    const { data: column } = await supabase
      .from('conference_board_columns')
      .select('id')
      .eq('id', body.column_id)
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .single()

    if (!column) {
      return NextResponse.json({ error: 'Column not found in this event' }, { status: 400 })
    }
  }

  // Verify team belongs to this event + church (only when team_id provided)
  if (body.team_id) {
    const { data: team } = await supabase
      .from('conference_teams')
      .select('id')
      .eq('id', body.team_id)
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this event' }, { status: 400 })
    }
  }

  // Must have either a column or a team
  if (!body.column_id && !body.team_id) {
    return NextResponse.json({ error: 'Card must be linked to a column or a team' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conference_board_cards')
    .upsert(
      {
        ...body,
        event_id: eventId,
        church_id: profile.church_id,
      },
      { onConflict: 'team_id', ignoreDuplicates: false }
    )
    .select('id, church_id, event_id, column_id, team_id, ministry_id, custom_name, custom_name_ar, assigned_leader_id, assigned_leader_external_phone, headcount_target, status, sort_order, leader_notified_at, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
