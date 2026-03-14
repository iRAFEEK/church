import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ReplaceTemplateSegmentsSchema } from '@/lib/schemas/template'

// GET /api/templates/[id]/segments — list segments ordered
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const templateId = params!.id

  const { data, error } = await supabase
    .from('event_template_segments')
    .select(`
      id, title, title_ar, duration_minutes, ministry_id, assigned_to,
      notes, notes_ar, sort_order,
      ministry:ministry_id(id, name, name_ar),
      profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar)
    `)
    .eq('template_id', templateId)
    .eq('church_id', profile.church_id)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return { data: data || [] }
})

// PUT /api/templates/[id]/segments — replace all segments
export const PUT = apiHandler(async ({ req, supabase, profile, params }) => {
  const templateId = params!.id
  const { segments } = validate(ReplaceTemplateSegmentsSchema, await req.json())

  // Delete existing
  const { error: deleteError } = await supabase
    .from('event_template_segments')
    .delete()
    .eq('template_id', templateId)
    .eq('church_id', profile.church_id)

  if (deleteError) throw deleteError

  // Insert new
  if (segments.length > 0) {
    const rows = segments.map((s, i: number) => ({
      template_id: templateId,
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

    const { error } = await supabase.from('event_template_segments').insert(rows)
    if (error) throw error
  }

  return { success: true }
}, {
  requirePermissions: ['can_manage_templates'],
})
