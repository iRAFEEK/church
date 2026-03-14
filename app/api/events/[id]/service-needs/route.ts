import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ReplaceServiceNeedsSchema } from '@/lib/schemas/event'
import { notifyEventServiceRequest } from '@/lib/messaging/triggers'
import { logger } from '@/lib/logger'

interface ServiceNeedRow {
  id: string
  ministry_id: string | null
  group_id: string | null
  volunteers_needed: number
  notes: string | null
  notes_ar: string | null
  ministry: { id: string; name: string; name_ar: string | null; leader_id: string | null } | null
  group: { id: string; name: string; name_ar: string | null; leader_id: string | null; co_leader_id: string | null } | null
  event_service_assignments: {
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
  }[]
}

// GET /api/events/[id]/service-needs — list service needs with assignment counts
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  const { data: needs, error } = await supabase
    .from('event_service_needs')
    .select(`
      id, event_id, ministry_id, group_id, volunteers_needed, notes, notes_ar,
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

  // Enrich with assignment counts
  const enriched = ((needs || []) as unknown as ServiceNeedRow[]).map((need) => ({
    ...need,
    assignments: need.event_service_assignments || [],
    assigned_count: (need.event_service_assignments || []).filter(
      (a) => a.status !== 'declined'
    ).length,
    event_service_assignments: undefined,
  }))

  return { data: enriched }
})

// PUT /api/events/[id]/service-needs — replace all service needs
export const PUT = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(ReplaceServiceNeedsSchema, await req.json())
  const { needs } = body

  // Get existing needs for diffing
  const { data: existing } = await supabase
    .from('event_service_needs')
    .select('id, ministry_id, group_id')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  const existingMap = new Map(
    (existing || []).map((e: { id: string; ministry_id: string | null; group_id: string | null }) => [
      e.ministry_id ? `m:${e.ministry_id}` : `g:${e.group_id}`,
      e.id,
    ])
  )

  // Determine which needs are new (for notifications)
  const newNeedKeys = new Set<string>()
  const incomingKeys = new Set<string>()

  for (const need of needs) {
    const key = need.ministry_id ? `m:${need.ministry_id}` : `g:${need.group_id}`
    incomingKeys.add(key)
    if (!existingMap.has(key)) {
      newNeedKeys.add(key)
    }
  }

  // Delete needs that are no longer in the list
  const toDelete = (existing || []).filter((e: { id: string; ministry_id: string | null; group_id: string | null }) => {
    const key = e.ministry_id ? `m:${e.ministry_id}` : `g:${e.group_id}`
    return !incomingKeys.has(key)
  })

  if (toDelete.length > 0) {
    await supabase
      .from('event_service_needs')
      .delete()
      .in('id', toDelete.map((d: { id: string }) => d.id))
  }

  // Upsert remaining needs
  const upsertData = needs.map((need) => {
    const key = need.ministry_id ? `m:${need.ministry_id}` : `g:${need.group_id}`
    const existingId = existingMap.get(key)
    return {
      ...(existingId ? { id: existingId } : {}),
      event_id: eventId,
      church_id: profile.church_id,
      ministry_id: need.ministry_id || null,
      group_id: need.group_id || null,
      volunteers_needed: need.volunteers_needed || 1,
      notes: need.notes || null,
      notes_ar: need.notes_ar || null,
    }
  })

  if (upsertData.length > 0) {
    const { error } = await supabase
      .from('event_service_needs')
      .upsert(upsertData)

    if (error) throw error
  }

  // Send notifications for newly added needs (fire-and-forget)
  if (newNeedKeys.size > 0) {
    // Re-fetch to get the IDs of the newly inserted needs
    const { data: allNeeds } = await supabase
      .from('event_service_needs')
      .select('id, ministry_id, group_id')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)

    for (const need of allNeeds || []) {
      const key = (need as { id: string; ministry_id: string | null; group_id: string | null }).ministry_id
        ? `m:${(need as { ministry_id: string }).ministry_id}`
        : `g:${(need as { group_id: string }).group_id}`
      if (newNeedKeys.has(key)) {
        notifyEventServiceRequest(eventId, need.id, profile.church_id).catch((err) =>
          logger.error('notifyEventServiceRequest fire-and-forget failed', { module: 'events', churchId: profile.church_id, error: err })
        )
      }
    }
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_events'] })
