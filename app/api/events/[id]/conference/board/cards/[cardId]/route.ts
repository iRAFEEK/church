import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'

const updateCardSchema = z.object({
  column_id: z.string().uuid().optional(),
  ministry_id: z.string().uuid().optional().nullable(),
  custom_name: z.string().max(100).optional().nullable(),
  custom_name_ar: z.string().max(100).optional().nullable(),
  assigned_leader_id: z.string().uuid().optional().nullable(),
  assigned_leader_external_phone: z.string().max(30).optional().nullable(),
  headcount_target: z.number().int().positive().optional().nullable(),
  status: z.enum(['planning', 'leader_notified', 'in_progress', 'ready']).optional(),
  sort_order: z.number().int().min(0).optional(),
})

// PATCH /api/events/[id]/conference/board/cards/[cardId] — update card
export const PATCH = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const cardId = params!.cardId
  const body = validate(updateCardSchema, await req.json())

  const { data: card } = await supabase
    .from('conference_board_cards')
    .select('id, assigned_leader_id')
    .eq('id', cardId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const isAdmin = profile.role === 'super_admin' || profile.role === 'ministry_leader'
  const isAssignedLeader = card.assigned_leader_id === user.id

  if (!isAdmin && !isAssignedLeader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Assigned leader can only update headcount_target and status
  const updatePayload: Record<string, unknown> = {}
  if (isAdmin) {
    Object.assign(updatePayload, body)
  } else {
    // Assigned leader restricted fields
    if (body.headcount_target !== undefined) updatePayload.headcount_target = body.headcount_target
    if (body.status !== undefined) updatePayload.status = body.status
  }

  // If column_id is being changed, verify new column belongs to this event
  if (updatePayload.column_id) {
    const { data: newColumn } = await supabase
      .from('conference_board_columns')
      .select('id')
      .eq('id', updatePayload.column_id as string)
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .single()

    if (!newColumn) {
      return NextResponse.json({ error: 'Target column not found in this event' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('conference_board_cards')
    .update(updatePayload)
    .eq('id', cardId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, column_id, ministry_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order, leader_notified_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
})
