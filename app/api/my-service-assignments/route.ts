import { apiHandler } from '@/lib/api/handler'

// GET /api/my-service-assignments — current user's upcoming service assignments
export const GET = apiHandler(async ({ supabase, user, profile }) => {
  const { data: assignments, error } = await supabase
    .from('event_service_assignments')
    .select(`
      id,
      service_need_id,
      status,
      notes,
      role,
      role_ar,
      created_at,
      service_need:service_need_id(
        id,
        volunteers_needed,
        ministry:ministry_id(name, name_ar),
        group:group_id(name, name_ar),
        event:event_id(id, title, title_ar, starts_at, ends_at, location, status)
      )
    `)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)

  if (error) throw error

  // Flatten and filter to upcoming events
  const now = new Date().toISOString()
  type Assignment = {
    id: string
    service_need_id: string
    status: string
    notes: string | null
    role: string | null
    role_ar: string | null
    created_at: string
    service_need: {
      id: string
      volunteers_needed: number
      ministry: { name: string; name_ar: string } | null
      group: { name: string; name_ar: string } | null
      event: { id: string; title: string; title_ar: string; starts_at: string; ends_at: string; location: string | null; status: string } | null
    } | null
  }
  const enriched = ((assignments as unknown as Assignment[]) || [])
    .map((a) => {
      const need = a.service_need
      if (!need?.event) return null
      return {
        id: a.id,
        service_need_id: a.service_need_id,
        status: a.status,
        role: a.role,
        role_ar: a.role_ar,
        event: need.event,
        ministry: need.ministry,
        group: need.group,
        volunteers_needed: need.volunteers_needed,
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null && a.event.starts_at >= now && a.event.status !== 'cancelled')
    .sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at))

  return { data: enriched }
})
