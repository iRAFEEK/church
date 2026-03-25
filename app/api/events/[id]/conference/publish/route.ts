import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferencePublishSchema } from '@/lib/schemas/conference-broadcast'
import { resolveAudience } from '@/lib/messaging/audience'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

const BATCH_SIZE = 10

// POST /api/events/[id]/conference/publish — publish conference + optional church-wide broadcast
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferencePublishSchema, await req.json())

  // Verify event belongs to this church
  const { data: event } = await supabase
    .from('events')
    .select('id, title, title_ar, conference_settings')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const { notify_church, ...publishSettings } = body

  const existingSettings = (event.conference_settings as Record<string, unknown>) || {}
  const mergedSettings = {
    ...existingSettings,
    ...publishSettings,
    published_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'published',
      conference_settings: mergedSettings,
    })
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, title, title_ar, status, conference_mode, conference_settings')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  revalidateTag(`events-${profile.church_id}`)
  revalidateTag(`dashboard-${profile.church_id}`)

  // Optionally broadcast to the whole church
  if (notify_church) {
    ;(async () => {
      const audience = await resolveAudience(profile.church_id, [{ type: 'all_church' }])

      for (let i = 0; i < audience.profileIds.length; i += BATCH_SIZE) {
        const batch = audience.profileIds.slice(i, i + BATCH_SIZE)
        await Promise.allSettled(
          batch.map((profileId: string) =>
            sendNotification({
              profileId,
              churchId: profile.church_id,
              type: 'general',
              titleEn: `Conference Announced: ${event.title}`,
              titleAr: `إعلان مؤتمر: ${event.title_ar || event.title}`,
              bodyEn: body.public_tagline || `Join us for ${event.title}`,
              bodyAr: body.public_tagline_ar || body.public_tagline || `انضم إلينا في ${event.title_ar || event.title}`,
              referenceId: eventId,
              referenceType: 'event',
            })
          )
        )
      }
    })().catch((err) =>
      logger.error('Conference publish church notification failed', {
        module: 'conference',
        churchId: profile.church_id,
        error: err,
      })
    )
  }

  return { data }
}, { requirePermissions: ['can_manage_conference'] })
