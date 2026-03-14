import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ReplaceTemplateNeedsSchema } from '@/lib/schemas/template'

// PUT /api/templates/[id]/needs — replace all template needs
export const PUT = apiHandler(async ({ req, supabase, profile, params }) => {
  const templateId = params!.id
  const { needs } = validate(ReplaceTemplateNeedsSchema, await req.json())

  // Delete existing needs
  const { error: deleteError } = await supabase
    .from('event_template_needs')
    .delete()
    .eq('template_id', templateId)
    .eq('church_id', profile.church_id)

  if (deleteError) throw deleteError

  // Insert new needs
  if (needs.length > 0) {
    const rows = needs.map((n) => ({
      template_id: templateId,
      church_id: profile.church_id,
      ministry_id: n.ministry_id || null,
      group_id: n.group_id || null,
      volunteers_needed: n.volunteers_needed || 1,
      notes: n.notes || null,
      notes_ar: n.notes_ar || null,
      role_presets: n.role_presets || [],
    }))

    const { error } = await supabase.from('event_template_needs').insert(rows)
    if (error) throw error
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, {
  requirePermissions: ['can_manage_templates'],
})
