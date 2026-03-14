import { apiHandler } from '@/lib/api/handler'

interface AssignmentItem {
  id: string
  profile_id: string
  status: string
  assigned_by: string | null
  notes: string | null
  role: string | null
  role_ar: string | null
  created_at: string
  profile: {
    id: string
    first_name: string
    last_name: string
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
    phone: string | null
  } | null
}

interface ServiceNeedRow {
  id: string
  ministry_id: string | null
  group_id: string | null
  volunteers_needed: number
  notes: string | null
  notes_ar: string | null
  ministry: { id: string; name: string; name_ar: string | null; leader_id: string | null } | null
  group: { id: string; name: string; name_ar: string | null; leader_id: string | null; co_leader_id: string | null } | null
  event_service_assignments: AssignmentItem[]
}

interface GroupedSummary {
  type: string
  ministry: ServiceNeedRow['ministry']
  group: ServiceNeedRow['group']
  needs: { id: string; volunteers_needed: number; notes: string | null; notes_ar: string | null }[]
  assignments: AssignmentItem[]
  stats: { total_needed: number; assigned: number; confirmed: number; declined: number; pending: number }
}

// GET /api/events/[id]/ministry-summary — service needs grouped by ministry/group
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  const { data: needs, error } = await supabase
    .from('event_service_needs')
    .select(`
      id, ministry_id, group_id, volunteers_needed, notes, notes_ar,
      ministry:ministry_id(id, name, name_ar, leader_id),
      group:group_id(id, name, name_ar, leader_id, co_leader_id),
      event_service_assignments(
        id, profile_id, status, assigned_by, notes, role, role_ar, created_at,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone)
      )
    `)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  // Group by ministry/group
  const grouped: Record<string, GroupedSummary> = {}

  for (const need of (needs || []) as unknown as ServiceNeedRow[]) {
    const key = need.ministry_id
      ? `ministry:${need.ministry_id}`
      : `group:${need.group_id}`

    if (!grouped[key]) {
      grouped[key] = {
        type: need.ministry_id ? 'ministry' : 'group',
        ministry: need.ministry || null,
        group: need.group || null,
        needs: [],
        assignments: [],
        stats: { total_needed: 0, assigned: 0, confirmed: 0, declined: 0, pending: 0 },
      }
    }

    const assignments = need.event_service_assignments || []
    grouped[key].needs.push({
      id: need.id,
      volunteers_needed: need.volunteers_needed,
      notes: need.notes,
      notes_ar: need.notes_ar,
    })

    grouped[key].stats.total_needed += need.volunteers_needed

    for (const a of assignments) {
      grouped[key].assignments.push(a)
      if (a.status === 'confirmed') grouped[key].stats.confirmed++
      else if (a.status === 'declined') grouped[key].stats.declined++
      else grouped[key].stats.pending++
      if (a.status !== 'declined') grouped[key].stats.assigned++
    }
  }

  return { data: Object.values(grouped) }
})
