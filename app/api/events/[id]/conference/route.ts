import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { z } from 'zod'

const conferenceToggleSchema = z.object({
  conference_mode: z.boolean().optional(),
  conference_settings: z.record(z.unknown()).optional(),
})

// PATCH /api/events/[id]/conference — toggle conference mode + merge settings
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceToggleSchema, await req.json())

  // Verify event belongs to this church
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, conference_mode, conference_settings')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const mergedSettings = body.conference_settings
    ? { ...(event.conference_settings as Record<string, unknown> || {}), ...body.conference_settings }
    : event.conference_settings

  const updateFields: Record<string, unknown> = { conference_settings: mergedSettings }
  if (body.conference_mode !== undefined) {
    updateFields.conference_mode = body.conference_mode
  }

  const { data, error } = await supabase
    .from('events')
    .update(updateFields)
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, title, title_ar, conference_mode, conference_settings')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  revalidateTag(`events-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_conference'] })
