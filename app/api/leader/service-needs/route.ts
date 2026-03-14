import { apiHandler } from '@/lib/api/handler'

// GET /api/leader/service-needs — service needs where current user is leader
export const GET = apiHandler(async ({ supabase, user, profile }) => {
  // Find ministries where user is leader
  const { data: ledMinistries } = await supabase
    .from('ministries')
    .select('id')
    .eq('leader_id', user.id)
    .eq('church_id', profile.church_id)

  // Find groups where user is leader or co-leader
  const { data: ledGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('church_id', profile.church_id)
    .or(`leader_id.eq.${user.id},co_leader_id.eq.${user.id}`)

  const ministryIds = (ledMinistries || []).map((m: { id: string }) => m.id)
  const groupIds = (ledGroups || []).map((g: { id: string }) => g.id)

  if (ministryIds.length === 0 && groupIds.length === 0) {
    return { data: [] }
  }

  // Build OR filter for service needs
  const filters: string[] = []
  if (ministryIds.length > 0) {
    filters.push(`ministry_id.in.(${ministryIds.join(',')})`)
  }
  if (groupIds.length > 0) {
    filters.push(`group_id.in.(${groupIds.join(',')})`)
  }

  const { data: needs, error } = await supabase
    .from('event_service_needs')
    .select(`
      id, volunteers_needed, notes, role_presets, church_id,
      ministry:ministry_id(id, name, name_ar),
      group:group_id(id, name, name_ar),
      event:event_id(id, title, title_ar, starts_at, ends_at, location, status),
      event_service_assignments(id, status)
    `)
    .eq('church_id', profile.church_id)
    .or(filters.join(','))

  if (error) throw error

  // Filter to upcoming events only and enrich
  const now = new Date().toISOString()
  type ServiceNeed = {
    id: string
    volunteers_needed: number
    notes: string | null
    role_presets: unknown
    church_id: string
    ministry: { id: string; name: string; name_ar: string } | null
    group: { id: string; name: string; name_ar: string } | null
    event: { id: string; title: string; title_ar: string; starts_at: string; ends_at: string; location: string | null; status: string } | null
    event_service_assignments: { id: string; status: string }[]
  }
  const enriched = ((needs as unknown as ServiceNeed[]) || [])
    .filter((n) => n.event && n.event.starts_at >= now && n.event.status !== 'cancelled')
    .map((n) => ({
      ...n,
      assigned_count: (n.event_service_assignments || []).filter(
        (a) => a.status !== 'declined'
      ).length,
      confirmed_count: (n.event_service_assignments || []).filter(
        (a) => a.status === 'confirmed'
      ).length,
      event_service_assignments: undefined,
    }))
    .sort((a, b) => a.event!.starts_at.localeCompare(b.event!.starts_at))

  return { data: enriched }
})
