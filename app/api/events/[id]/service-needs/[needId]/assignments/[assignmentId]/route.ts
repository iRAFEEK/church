import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateAssignmentSchema } from '@/lib/schemas/event'
import { notifyAssignmentResponse } from '@/lib/messaging/triggers'
import { logger } from '@/lib/logger'

// PATCH — update assignment (status confirm/decline, or role edit)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const assignmentId = params!.assignmentId
  const body = validate(UpdateAssignmentSchema, await req.json())

  const updatePayload: Record<string, string> = {}

  if (body.status) {
    updatePayload.status = body.status
    updatePayload.status_changed_at = new Date().toISOString()
  }

  if (body.role !== undefined) updatePayload.role = body.role || ''
  if (body.role_ar !== undefined) updatePayload.role_ar = body.role_ar || ''

  const { data: assignment, error } = await supabase
    .from('event_service_assignments')
    .update(updatePayload)
    .eq('id', assignmentId)
    .eq('church_id', profile.church_id)
    .select('id, service_need_id, profile_id, status, role, role_ar, assigned_by, church_id, status_changed_at')
    .single()

  if (error) throw error

  // Notify assigner when member confirms/declines
  if (body.status && assignment.assigned_by) {
    notifyAssignmentResponse(assignmentId, assignment.church_id).catch((err) =>
      logger.error('notifyAssignmentResponse fire-and-forget failed', { module: 'events', churchId: assignment.church_id, error: err })
    )
  }

  return { data: assignment }
})
