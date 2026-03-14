import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ReplaceSegmentsSchema } from '@/lib/schemas/event'

// GET /api/events/[id]/segments — list event segments ordered
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  const { data, error } = await supabase
    .from('event_segments')
    .select(`
      id, event_id, title, title_ar, duration_minutes, sort_order, notes, notes_ar, ministry_id, assigned_to,
      ministry:ministry_id(id, name, name_ar),
      profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar)
    `)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return { data: data || [] }
})

// PUT /api/events/[id]/segments — replace all event segments
export const PUT = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(ReplaceSegmentsSchema, await req.json())
  const { segments } = body

  // Delete existing
  await supabase
    .from('event_segments')
    .delete()
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  // Insert new
  if (segments.length > 0) {
    const rows = segments.map((s, i) => ({
      event_id: eventId,
      church_id: profile.church_id,
      title: s.title,
      title_ar: s.title_ar || null,
      duration_minutes: s.duration_minutes || null,
      ministry_id: s.ministry_id || null,
      assigned_to: s.assigned_to || null,
      notes: s.notes || null,
      notes_ar: s.notes_ar || null,
      sort_order: i,
    }))

    const { error } = await supabase.from('event_segments').insert(rows)
    if (error) throw error
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_events'] })
