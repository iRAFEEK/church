import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const RETENTION_DAYS = 90

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Delete all notifications older than 90 days
  const { count, error } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    console.error('[notification-cleanup] Failed to delete old notifications:', error)
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
  }

  const deleted = count ?? 0
  console.log(
    `[notification-cleanup] Deleted ${deleted} notifications older than ${RETENTION_DAYS} days (cutoff: ${cutoff})`
  )

  return NextResponse.json({
    deleted,
    retention_days: RETENTION_DAYS,
    cutoff,
  })
}
