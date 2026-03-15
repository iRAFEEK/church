import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateOutreachAssignmentStatusSchema } from '@/lib/schemas/outreach-assignment'

// PATCH /api/outreach/assignments/[id] — update status
export const PATCH = apiHandler(async ({ req, supabase, profile, params, resolvedPermissions }) => {
  const body = validate(UpdateOutreachAssignmentStatusSchema, await req.json())
  const churchId = profile.church_id
  const id = params?.id

  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check the assignment exists and belongs to this church
  const { data: existing } = await supabase
    .from('outreach_assignments')
    .select('id, assigned_to')
    .eq('id', id)
    .eq('church_id', churchId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Allow update if user is the assignee OR has can_manage_outreach permission
  const isAssignee = existing.assigned_to === profile.id
  const canManage = resolvedPermissions.can_manage_outreach

  if (!isAssignee && !canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('outreach_assignments')
    .update({
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('church_id', churchId)
    .select('id, member_id, assigned_to, assigned_by, notes, status, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`outreach-${churchId}`)
  return NextResponse.json({ data })
})

// DELETE /api/outreach/assignments/[id] — delete assignment
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const churchId = profile.church_id
  const id = params?.id

  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('outreach_assignments')
    .delete()
    .eq('id', id)
    .eq('church_id', churchId)

  if (error) throw error

  revalidateTag(`outreach-${churchId}`)
  return NextResponse.json({ success: true })
}, { requirePermissions: ['can_manage_outreach'] })
