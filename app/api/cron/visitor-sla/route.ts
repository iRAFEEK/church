import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyVisitorSLA } from '@/lib/messaging/triggers'
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { logger } from '@/lib/logger'

const CHURCH_BATCH_SIZE = 5
const VISITOR_BATCH_SIZE = 25

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const supabase = await createAdminClient()

  // Get all churches with their SLA hours
  const { data: churches } = await supabase
    .from('churches')
    .select('id, visitor_sla_hours')
    .eq('is_active', true)

  if (!churches?.length) {
    return NextResponse.json({ escalated: 0, failed: 0, message: 'No active churches' })
  }

  let escalated = 0
  let failed = 0

  // Process churches in parallel batches of 5
  for (let ci = 0; ci < churches.length; ci += CHURCH_BATCH_SIZE) {
    const churchBatch = churches.slice(ci, ci + CHURCH_BATCH_SIZE)

    const churchResults = await Promise.allSettled(
      churchBatch.map(async (church) => {
        const slaHours = church.visitor_sla_hours || 48
        const slaDeadline = new Date(Date.now() - slaHours * 60 * 60 * 1000).toISOString()

        // Find visitors past SLA: status is 'new', visited before deadline, not yet escalated
        const { data: visitors } = await supabase
          .from('visitors')
          .select('id')
          .eq('church_id', church.id)
          .eq('status', 'new')
          .is('escalated_at', null)
          .lt('visited_at', slaDeadline)

        if (!visitors?.length) return { sent: 0, failed: 0 }

        let churchSent = 0
        let churchFailed = 0

        // Batch notify + update visitors
        for (let vi = 0; vi < visitors.length; vi += VISITOR_BATCH_SIZE) {
          const visitorBatch = visitors.slice(vi, vi + VISITOR_BATCH_SIZE)

          const notifyResults = await Promise.allSettled(
            visitorBatch.map(visitor => notifyVisitorSLA(visitor.id, church.id))
          )

          // Collect IDs of successfully notified visitors for batch update
          const succeededIds: string[] = []
          for (let idx = 0; idx < notifyResults.length; idx++) {
            if (notifyResults[idx].status === 'fulfilled') {
              succeededIds.push(visitorBatch[idx].id)
              churchSent++
            } else {
              churchFailed++
              const reason = (notifyResults[idx] as PromiseRejectedResult).reason
              logger.error('Visitor SLA notification failed', {
                module: 'cron',
                churchId: church.id,
                route: '/api/cron/visitor-sla',
                error: reason,
              })
            }
          }

          // Batch update escalated_at for all successfully notified visitors
          if (succeededIds.length > 0) {
            await supabase
              .from('visitors')
              .update({ escalated_at: new Date().toISOString() })
              .in('id', succeededIds)
          }
        }

        return { sent: churchSent, failed: churchFailed }
      })
    )

    // Aggregate results from this church batch
    for (const result of churchResults) {
      if (result.status === 'fulfilled') {
        escalated += result.value.sent
        failed += result.value.failed
      } else {
        logger.error('Visitor SLA church batch failed', {
          module: 'cron',
          route: '/api/cron/visitor-sla',
          error: result.reason,
        })
      }
    }
  }

  return NextResponse.json({ escalated, failed })
}
