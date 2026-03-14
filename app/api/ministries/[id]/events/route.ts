import { apiHandler } from '@/lib/api/handler'

interface EventRecord {
  id: string
  title: string
  title_ar: string | null
  event_type: string
  starts_at: string
  ends_at: string | null
  location: string | null
  status: string
}

interface ServiceNeedRow {
  event_id: string
  volunteers_needed: number
  event: EventRecord | EventRecord[] | null
}

// GET /api/ministries/[id]/events — get events linked to this ministry via service needs
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const ministryId = params!.id

  // Get events linked to this ministry via event_service_needs
  const { data: needs } = await supabase
    .from('event_service_needs')
    .select(`
      event_id,
      volunteers_needed,
      event:event_id(id, title, title_ar, event_type, starts_at, ends_at, location, status)
    `)
    .eq('ministry_id', ministryId)
    .eq('church_id', profile.church_id)

  if (!needs) return { data: { upcoming: [], recent: [] } }

  // Deduplicate events and split into upcoming/recent
  const now = new Date().toISOString()
  const seen = new Set<string>()
  const upcoming: EventRecord[] = []
  const recent: EventRecord[] = []

  for (const need of needs as ServiceNeedRow[]) {
    const rawEvent = need.event
    // Supabase returns single-FK joins as an array — unwrap if needed
    const event = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent
    if (!event || seen.has(event.id)) continue
    seen.add(event.id)

    if (event.starts_at >= now && event.status !== 'cancelled') {
      upcoming.push(event)
    } else {
      recent.push(event)
    }
  }

  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  recent.sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return {
    data: {
      upcoming: upcoming.slice(0, 10),
      recent: recent.slice(0, 10),
    }
  }
})
