import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/visitors/escalations — SLA-breached uncontacted visitors
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get church SLA hours
  const { data: profile } = await supabase
    .from('profiles')
    .select('church:church_id(visitor_sla_hours)')
    .eq('id', user.id)
    .single()

  const slaHours = (profile?.church as { visitor_sla_hours?: number } | null)?.visitor_sla_hours ?? 48
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('visitors')
    .select('*, assigned_profile:assigned_to(id,first_name,last_name)')
    .in('status', ['new', 'assigned'])
    .lt('visited_at', cutoff)
    .order('visited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, sla_hours: slaHours })
}
