import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceAreaSchema } from '@/lib/schemas/conference-area'

// PATCH /api/events/[id]/conference/areas/[areaId] — update area
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const areaId = params!.areaId
  const body = validate(conferenceAreaSchema.partial(), await req.json())

  const { data: area } = await supabase
    .from('conference_areas')
    .select('id')
    .eq('id', areaId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!area) {
    return NextResponse.json({ error: 'Area not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('conference_areas')
    .update(body)
    .eq('id', areaId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
}, { requirePermissions: ['can_manage_conference'] })

// DELETE /api/events/[id]/conference/areas/[areaId] — delete area (cascade via DB)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const areaId = params!.areaId

  const { data: area } = await supabase
    .from('conference_areas')
    .select('id')
    .eq('id', areaId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!area) {
    return NextResponse.json({ error: 'Area not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_areas')
    .delete()
    .eq('id', areaId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference'] })
