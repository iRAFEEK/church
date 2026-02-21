import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyGatheringReminder } from '@/lib/messaging/triggers'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Find gatherings scheduled within the next 24 hours
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: gatherings } = await supabase
    .from('gatherings')
    .select('id, church_id')
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', tomorrow.toISOString())

  if (!gatherings?.length) {
    return NextResponse.json({ sent: 0, message: 'No upcoming gatherings' })
  }

  // Check which gatherings already have reminders sent
  const gatheringIds = gatherings.map(g => g.id)
  const { data: existing } = await supabase
    .from('notifications_log')
    .select('reference_id')
    .eq('type', 'gathering_reminder')
    .in('reference_id', gatheringIds)

  const alreadySent = new Set(existing?.map(e => e.reference_id) || [])

  let sent = 0
  for (const gathering of gatherings) {
    if (alreadySent.has(gathering.id)) continue

    await notifyGatheringReminder(gathering.id, gathering.church_id)
    sent++
  }

  return NextResponse.json({ sent, total: gatherings.length })
}
