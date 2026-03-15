import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateEventSchema } from '@/lib/schemas/event'

// GET /api/events/[id] — get event detail
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const [{ data, error }, { count: registrationCount }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, status, registration_required, registration_closes_at, notes, notes_ar, custom_field_values, created_by, created_at, event_visibility_targets(target_type, target_id)')
      .eq('id', id)
      .eq('church_id', profile.church_id)
      .single(),
    supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('church_id', profile.church_id)
      .neq('status', 'cancelled'),
  ])

  if (error) throw error
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })

  return { data: { ...data, registration_count: registrationCount ?? 0 } }
})

// PATCH /api/events/[id] — update event
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateEventSchema, await req.json())
  const { visibility_targets, ...eventData } = body

  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, title, title_ar, event_type, starts_at, ends_at, status, created_at')
    .single()

  if (error) throw error

  // Update visibility targets
  if (visibility_targets !== undefined) {
    await supabase.from('event_visibility_targets').delete().eq('event_id', id)
    if (visibility_targets.length > 0) {
      await supabase.from('event_visibility_targets').insert(
        visibility_targets.map((t) => ({
          event_id: id,
          target_type: t.target_type,
          target_id: t.target_id,
        }))
      )
    }
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_events'] })

// DELETE /api/events/[id] — delete event
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_events'] })
