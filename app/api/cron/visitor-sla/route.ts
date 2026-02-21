import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyVisitorSLA } from '@/lib/messaging/triggers'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Get all churches with their SLA hours
  const { data: churches } = await supabase
    .from('churches')
    .select('id, visitor_sla_hours')
    .eq('is_active', true)

  if (!churches?.length) {
    return NextResponse.json({ escalated: 0, message: 'No active churches' })
  }

  let escalated = 0

  for (const church of churches) {
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

    if (!visitors?.length) continue

    for (const visitor of visitors) {
      await notifyVisitorSLA(visitor.id, church.id)

      // Mark as escalated to prevent duplicate alerts
      await supabase
        .from('visitors')
        .update({ escalated_at: new Date().toISOString() })
        .eq('id', visitor.id)

      escalated++
    }
  }

  return NextResponse.json({ escalated })
}
