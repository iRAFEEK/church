import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceInviteSchema } from '@/lib/schemas/conference-broadcast'

// POST /api/events/[id]/conference/board/invite — create collaborator invite
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceInviteSchema, await req.json())

  // Verify event belongs to this church
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // If card_id provided, verify it belongs to this event
  if (body.card_id) {
    const { data: card } = await supabase
      .from('conference_board_cards')
      .select('id')
      .eq('id', body.card_id)
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .single()

    if (!card) {
      return NextResponse.json({ error: 'Card not found in this event' }, { status: 400 })
    }
  }

  const inviteToken = crypto.randomUUID()

  const { data, error } = await supabase
    .from('conference_collaborators')
    .insert({
      event_id: eventId,
      church_id: profile.church_id,
      card_id: body.card_id ?? null,
      invited_by: user.id,
      role: body.role,
      invite_token: inviteToken,
      user_id: body.user_id ?? null,
      external_email: body.external_email ?? null,
      external_phone: body.external_phone ?? null,
      external_church_name: body.external_church_name ?? null,
    })
    .select('id, event_id, card_id, role, invite_token, created_at')
    .single()

  if (error) throw error

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const inviteLink = `${appUrl}/conference/invite/${inviteToken}`

  return NextResponse.json({ data, invite_link: inviteLink }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
