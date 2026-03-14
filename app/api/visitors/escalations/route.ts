import { apiHandler } from '@/lib/api/handler'

// GET /api/visitors/escalations — SLA-breached uncontacted visitors
export const GET = apiHandler(async ({ supabase, profile }) => {
  // Fetch church SLA config
  const { data: church } = await supabase
    .from('churches')
    .select('visitor_sla_hours')
    .eq('id', profile.church_id)
    .single()

  const slaHours = church?.visitor_sla_hours ?? 48
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000).toISOString()

  // ARCH: church_id filter is critical — without it, data from all churches is returned
  const { data, error } = await supabase
    .from('visitors')
    .select('id, first_name, last_name, phone, email, status, visited_at, assigned_to, notes, assigned_profile:assigned_to(id, first_name, last_name)')
    .eq('church_id', profile.church_id)
    .in('status', ['new', 'assigned'])
    .lt('visited_at', cutoff)
    .order('visited_at', { ascending: true })

  if (error) throw error
  return { data, sla_hours: slaHours }
})
