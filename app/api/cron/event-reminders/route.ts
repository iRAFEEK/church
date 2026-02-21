import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { TEMPLATES, interpolate } from '@/lib/messaging/templates'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Find events starting within the next 24 hours
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: events } = await supabase
    .from('events')
    .select('id, church_id, title, title_ar, starts_at, location')
    .eq('status', 'published')
    .gte('starts_at', now.toISOString())
    .lte('starts_at', tomorrow.toISOString())

  if (!events?.length) {
    return NextResponse.json({ sent: 0, message: 'No upcoming events' })
  }

  // Check which events already have reminders sent
  const eventIds = events.map(e => e.id)
  const { data: existing } = await supabase
    .from('notifications_log')
    .select('reference_id')
    .eq('type', 'event_reminder')
    .in('reference_id', eventIds)

  const alreadySent = new Set(existing?.map(e => e.reference_id) || [])

  let sent = 0
  const template = TEMPLATES.event_reminder

  for (const event of events) {
    if (alreadySent.has(event.id)) continue

    // Get confirmed registrants with profiles
    const { data: registrations } = await supabase
      .from('event_registrations')
      .select('profile_id')
      .eq('event_id', event.id)
      .eq('status', 'confirmed')
      .not('profile_id', 'is', null)

    if (!registrations?.length) continue

    const eventName = event.title_ar || event.title
    const time = new Date(event.starts_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

    for (const reg of registrations) {
      await sendNotification({
        profileId: reg.profile_id!,
        churchId: event.church_id,
        type: 'event_reminder',
        titleEn: template.titleEn,
        titleAr: template.titleAr,
        bodyEn: interpolate(template.bodyEn, { eventName, time }),
        bodyAr: interpolate(template.bodyAr, { eventName, time }),
        referenceId: event.id,
        referenceType: 'event',
        data: { eventName, time },
      })
      sent++
    }
  }

  return NextResponse.json({ sent, events: events.length })
}
