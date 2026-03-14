import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateTemplateSchema } from '@/lib/schemas/template'

// GET /api/templates/[id] — get template with needs and segments
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data: template, error } = await supabase
    .from('event_templates')
    .select(`
      id, church_id, name, name_ar, event_type, title, title_ar,
      description, description_ar, location, capacity, is_public,
      registration_required, notes, notes_ar, is_active,
      recurrence_type, recurrence_day, default_start_time, default_end_time,
      custom_fields, created_by, created_at, updated_at,
      event_template_needs(
        id, ministry_id, group_id, volunteers_needed, notes, notes_ar, role_presets,
        ministry:ministry_id(id, name, name_ar),
        group:group_id(id, name, name_ar)
      ),
      event_template_segments(
        id, title, title_ar, duration_minutes, ministry_id, assigned_to, notes, notes_ar, sort_order,
        ministry:ministry_id(id, name, name_ar),
        profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar)
      )
    `)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) throw error
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 })

  // Sort segments by sort_order
  const segments = Array.isArray(template.event_template_segments)
    ? [...template.event_template_segments].sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      )
    : []

  return {
    data: {
      ...template,
      needs: template.event_template_needs || [],
      segments,
      event_template_needs: undefined,
      event_template_segments: undefined,
    },
  }
})

// PATCH /api/templates/[id] — update template fields
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateTemplateSchema, await req.json())

  const { data, error } = await supabase
    .from('event_templates')
    .update(body)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, event_type, title, title_ar, is_active, updated_at')
    .single()

  if (error) throw error
  return { data }
}, {
  requirePermissions: ['can_manage_templates'],
})

// DELETE /api/templates/[id] — soft-delete template
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('event_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  return { success: true }
}, {
  requirePermissions: ['can_manage_templates'],
})
