import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/visitors/escalations — SLA-breached uncontacted visitors
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ARCH: Fetch profile with church join to get both church_id and SLA config in one query
  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, church:church_id(visitor_sla_hours)')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const slaHours = (profile?.church as { visitor_sla_hours?: number } | null)?.visitor_sla_hours ?? 48
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000).toISOString()

  // ARCH: church_id filter is critical — without it, data from all churches is returned
  const { data, error } = await supabase
    .from('visitors')
    .select('*, assigned_profile:assigned_to(id,first_name,last_name)')
    .eq('church_id', profile.church_id)
    .in('status', ['new', 'assigned'])
    .lt('visited_at', cutoff)
    .order('visited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, sla_hours: slaHours })
}
