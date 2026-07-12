import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ReplaceSegmentsSchema, AppendSegmentSchema } from '@/lib/schemas/event'
import type { z } from 'zod'
import type { SegmentInputSchema } from '@/lib/schemas/event'

// Use the INPUT type: `kind` is optional here (the schema default fills it), and toRow
// already applies `s.kind ?? 'generic'`.
type SegmentInput = z.input<typeof SegmentInputSchema>

// Map a validated segment to a DB row (shared by PUT + POST).
function toRow(s: SegmentInput, eventId: string, churchId: string, sortOrder: number) {
  return {
    event_id: eventId,
    church_id: churchId,
    kind: s.kind ?? 'generic',
    title: s.title,
    title_ar: s.title_ar || null,
    duration_minutes: s.duration_minutes || null,
    ministry_id: s.ministry_id || null,
    assigned_to: s.assigned_to || null,
    notes: s.notes || null,
    notes_ar: s.notes_ar || null,
    song_id: s.song_id || null,
    bible_ref: s.bible_ref || null,
    attachment_url: s.attachment_url || null,
    attachment_name: s.attachment_name || null,
    attachment_type: s.attachment_type || null,
    sort_order: sortOrder,
  }
}

const SELECT = `
  id, event_id, kind, title, title_ar, duration_minutes, sort_order, notes, notes_ar,
  ministry_id, assigned_to, song_id, bible_ref, attachment_url, attachment_name, attachment_type,
  ministry:ministry_id(id, name, name_ar),
  profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar),
  song:song_id(id, title, title_ar)
`

// GET /api/events/[id]/segments — list event segments ordered
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  const { data, error } = await supabase
    .from('event_segments')
    .select(SELECT)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return { data: data || [] }
})

// PUT /api/events/[id]/segments — replace all event segments
export const PUT = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const { segments } = validate(ReplaceSegmentsSchema, await req.json())

  await supabase
    .from('event_segments')
    .delete()
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (segments.length > 0) {
    const rows = segments.map((s, i) => toRow(s, eventId, profile.church_id, i))
    const { error } = await supabase.from('event_segments').insert(rows)
    if (error) throw error
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_events'] })

// POST /api/events/[id]/segments — append ONE segment to the end (used by "Add to service"
// from the Songs and Bible pages). Sort order = current max + 1.
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const segment = validate(AppendSegmentSchema, await req.json())

  // Verify the event belongs to this church (also guards a bad id).
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const { data: last } = await supabase
    .from('event_segments')
    .select('sort_order')
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (last?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('event_segments')
    .insert(toRow(segment, eventId, profile.church_id, nextOrder))
    .select('id')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_events'] })
