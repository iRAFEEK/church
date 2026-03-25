import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

// POST /api/events/[id]/conference/board/cards/[cardId]/notify-leader — notify assigned leader
export const POST = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const cardId = params!.cardId

  const { data: card } = await supabase
    .from('conference_board_cards')
    .select(`id, assigned_leader_id, status, custom_name, custom_name_ar,
             ministry:ministry_id(name, name_ar)`)
    .eq('id', cardId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  if (!card.assigned_leader_id) {
    return NextResponse.json({ error: 'Card has no assigned leader' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Update card: set leader_notified_at + advance status to 'leader_notified' if still 'planning'
  const updatePayload: Record<string, unknown> = { leader_notified_at: now }
  if (card.status === 'planning') {
    updatePayload.status = 'leader_notified'
  }

  const { data, error } = await supabase
    .from('conference_board_cards')
    .update(updatePayload)
    .eq('id', cardId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, status, leader_notified_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)

  // Fetch event title for notification
  const { data: event } = await supabase
    .from('events')
    .select('title, title_ar')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  const cardName =
    (card as unknown as { custom_name_ar?: string }).custom_name_ar ||
    (card as unknown as { custom_name?: string }).custom_name ||
    (card as unknown as { ministry?: { name_ar?: string; name?: string } }).ministry?.name_ar ||
    (card as unknown as { ministry?: { name?: string } }).ministry?.name ||
    'Conference card'

  sendNotification({
    profileId: card.assigned_leader_id,
    churchId: profile.church_id,
    type: 'conference_task_assigned',
    titleEn: `Conference Assignment: ${event?.title || 'Conference'}`,
    titleAr: `تكليف مؤتمر: ${event?.title_ar || event?.title || 'مؤتمر'}`,
    bodyEn: `You have been assigned to coordinate: ${cardName}`,
    bodyAr: `تم تكليفك بتنسيق: ${cardName}`,
    referenceId: cardId,
    referenceType: 'conference_card',
    data: { url: `/conference/${eventId}/my-team` },
  }).catch((err) =>
    logger.error('Conference leader notification failed', {
      module: 'conference',
      churchId: profile.church_id,
      error: err,
    })
  )

  return { data }
}, { requirePermissions: ['can_manage_conference'] })
