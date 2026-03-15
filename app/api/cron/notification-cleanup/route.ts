import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { logger } from '@/lib/logger'

const RETENTION_DAYS = 90

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const supabase = await createAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Delete all notifications older than 90 days
  const { count, error } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    logger.error('[notification-cleanup] Failed to delete old notifications', { module: 'cron', error })
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
  }

  const deleted = count ?? 0
  logger.info(`[notification-cleanup] Deleted ${deleted} notifications older than ${RETENTION_DAYS} days`, { module: 'cron', deleted, retentionDays: RETENTION_DAYS, cutoff })

  return NextResponse.json({
    deleted,
    retention_days: RETENTION_DAYS,
    cutoff,
  })
}
