import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateOutreachVisitSchema } from '@/lib/schemas/outreach'

// PATCH /api/outreach/visits/[id] — update a visit
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateOutreachVisitSchema, await req.json())

  const updates: Record<string, unknown> = {}
  if (body.visit_date !== undefined) updates.visit_date = body.visit_date
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.needs_followup !== undefined) updates.needs_followup = body.needs_followup
  if (body.followup_date !== undefined) updates.followup_date = body.followup_date
  if (body.followup_notes !== undefined) updates.followup_notes = body.followup_notes

  const { data, error } = await supabase
    .from('outreach_visits')
    .update(updates)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_manage_outreach'] })

// DELETE /api/outreach/visits/[id] — delete a visit
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('outreach_visits')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  return { success: true }
}, { requirePermissions: ['can_manage_outreach'] })
