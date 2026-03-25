import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceBoardColumnSchema } from '@/lib/schemas/conference-broadcast'

// POST /api/events/[id]/conference/board/columns — create board column
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceBoardColumnSchema, await req.json())

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

  const { data, error } = await supabase
    .from('conference_board_columns')
    .insert({
      ...body,
      event_id: eventId,
      church_id: profile.church_id,
    })
    .select('id, church_id, event_id, name, name_ar, sort_order, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
