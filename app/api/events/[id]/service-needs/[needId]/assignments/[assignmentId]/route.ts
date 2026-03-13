import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyAssignmentResponse } from '@/lib/messaging/triggers'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string; needId: string; assignmentId: string }> }

// PATCH — update assignment (status confirm/decline, or role edit)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, role, role_ar } = body

  const updatePayload: Record<string, any> = {}

  if (status) {
    if (!['confirmed', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'status must be "confirmed" or "declined"' }, { status: 400 })
    }
    updatePayload.status = status
    updatePayload.status_changed_at = new Date().toISOString()
  }

  if (role !== undefined) updatePayload.role = role || null
  if (role_ar !== undefined) updatePayload.role_ar = role_ar || null

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: assignment, error } = await supabase
    .from('event_service_assignments')
    .update(updatePayload)
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify assigner when member confirms/declines
  if (status && assignment.assigned_by) {
    notifyAssignmentResponse(assignmentId, assignment.church_id).catch((err) =>
      logger.error('notifyAssignmentResponse fire-and-forget failed', { module: 'events', churchId: assignment.church_id, error: err })
    )
  }

  return NextResponse.json({ data: assignment })
}
