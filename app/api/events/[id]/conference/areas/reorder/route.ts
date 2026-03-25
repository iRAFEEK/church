import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceAreaReorderSchema } from '@/lib/schemas/conference-area'

// PUT /api/events/[id]/conference/areas/reorder — batch-reorder areas
export const PUT = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const items = validate(conferenceAreaReorderSchema, await req.json())

  // Verify all area IDs belong to this event + church
  const ids = items.map((i) => i.id)
  const { data: existing } = await supabase
    .from('conference_areas')
    .select('id')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .in('id', ids)

  if (!existing || existing.length !== ids.length) {
    return NextResponse.json(
      { error: 'One or more area IDs do not belong to this event' },
      { status: 400 }
    )
  }

  await Promise.all(
    items.map((item) =>
      supabase
        .from('conference_areas')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('event_id', eventId)
        .eq('church_id', profile.church_id)
    )
  )

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference'] })
