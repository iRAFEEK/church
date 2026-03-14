import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateTemplateSchema } from '@/lib/schemas/template'

// GET /api/templates — list templates for church
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('event_templates')
    .select(`
      id, church_id, name, name_ar, event_type, title, title_ar,
      description, description_ar, location, capacity, is_public,
      registration_required, notes, notes_ar, is_active,
      recurrence_type, recurrence_day, default_start_time, default_end_time,
      custom_fields, created_by, created_at, updated_at,
      event_template_needs(id),
      event_template_segments(id)
    `)
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error

  const enriched = (data || []).map((t) => ({
    ...t,
    needs_count: Array.isArray(t.event_template_needs) ? t.event_template_needs.length : 0,
    segments_count: Array.isArray(t.event_template_segments) ? t.event_template_segments.length : 0,
    event_template_needs: undefined,
    event_template_segments: undefined,
  }))

  return { data: enriched }
}, {
  cache: 'private, max-age=60, stale-while-revalidate=300',
})

// POST /api/templates — create template with needs and segments
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = validate(CreateTemplateSchema, await req.json())
  const { needs, segments, ...templateFields } = body

  // Create template
  const { data: template, error } = await supabase
    .from('event_templates')
    .insert({
      ...templateFields,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select('id, name, name_ar, event_type, title, title_ar, created_at')
    .single()

  if (error) throw error

  // Insert needs
  if (Array.isArray(needs) && needs.length > 0) {
    const needRows = needs.map((n) => ({
      template_id: template.id,
      church_id: profile.church_id,
      ministry_id: n.ministry_id || null,
      group_id: n.group_id || null,
      volunteers_needed: n.volunteers_needed || 1,
      notes: n.notes || null,
      notes_ar: n.notes_ar || null,
      role_presets: n.role_presets || [],
    }))
    const { error: needsError } = await supabase.from('event_template_needs').insert(needRows)
    if (needsError) throw needsError
  }

  // Insert segments
  if (Array.isArray(segments) && segments.length > 0) {
    const segRows = segments.map((s, i: number) => ({
      template_id: template.id,
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
    const { error: segError } = await supabase.from('event_template_segments').insert(segRows)
    if (segError) throw segError
  }

  return Response.json({ data: template }, { status: 201 })
}, {
  requirePermissions: ['can_manage_templates'],
})
