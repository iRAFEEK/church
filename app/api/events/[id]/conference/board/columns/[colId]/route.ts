import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceBoardColumnSchema } from '@/lib/schemas/conference-broadcast'

// PATCH /api/events/[id]/conference/board/columns/[colId] — update column
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const colId = params!.colId
  const body = validate(conferenceBoardColumnSchema.partial(), await req.json())

  const { data: column } = await supabase
    .from('conference_board_columns')
    .select('id')
    .eq('id', colId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('conference_board_columns')
    .update(body)
    .eq('id', colId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, church_id, event_id, name, name_ar, sort_order, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
}, { requirePermissions: ['can_manage_conference'] })

// DELETE /api/events/[id]/conference/board/columns/[colId] — delete column (cascades cards)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const colId = params!.colId

  const { data: column } = await supabase
    .from('conference_board_columns')
    .select('id')
    .eq('id', colId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_board_columns')
    .delete()
    .eq('id', colId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference'] })
