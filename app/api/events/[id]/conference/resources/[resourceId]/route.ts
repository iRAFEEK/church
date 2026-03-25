import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceResourceSchema } from '@/lib/schemas/conference-resource'

// PATCH /api/events/[id]/conference/resources/[resourceId] — update resource
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const resourceId = params!.resourceId
  const body = validate(conferenceResourceSchema.partial(), await req.json())

  const { data: resource } = await supabase
    .from('conference_resources')
    .select('id')
    .eq('id', resourceId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('conference_resources')
    .update(body)
    .eq('id', resourceId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, team_id, card_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
}, { requirePermissions: ['can_manage_conference'] })

// DELETE /api/events/[id]/conference/resources/[resourceId] — delete resource
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const resourceId = params!.resourceId

  const { data: resource } = await supabase
    .from('conference_resources')
    .select('id')
    .eq('id', resourceId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_resources')
    .delete()
    .eq('id', resourceId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference'] })
