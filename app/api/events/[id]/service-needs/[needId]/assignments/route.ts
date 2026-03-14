import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateAssignmentSchema, DeleteAssignmentSchema } from '@/lib/schemas/event'
import { notifyEventServiceAssigned } from '@/lib/messaging/triggers'
import { logger } from '@/lib/logger'

// GET — list assignments for a service need
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const needId = params!.needId

  const { data: assignments, error } = await supabase
    .from('event_service_assignments')
    .select(`
      id, service_need_id, profile_id, status, assigned_by, notes, role, role_ar, created_at,
      profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone)
    `)
    .eq('service_need_id', needId)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: true })

  if (error) throw error
  return { data: assignments }
})

// POST — assign a member to a service need
export const POST = apiHandler(async ({ req, supabase, user, profile, resolvedPermissions, params }) => {
  const eventId = params!.id
  const needId = params!.needId
  const body = validate(CreateAssignmentSchema, await req.json())

  // Verify the user has event management permission or is leader of the relevant ministry/group
  const isAdmin = resolvedPermissions.can_manage_events

  if (!isAdmin) {
    const { data: need } = await supabase
      .from('event_service_needs')
      .select('ministry_id, group_id')
      .eq('id', needId)
      .eq('church_id', profile.church_id)
      .single()

    if (!need) return Response.json({ error: 'Not found' }, { status: 404 })

    let isLeader = false
    if (need.ministry_id) {
      const { data: ministry } = await supabase
        .from('ministries')
        .select('leader_id')
        .eq('id', need.ministry_id)
        .eq('church_id', profile.church_id)
        .single()
      isLeader = ministry?.leader_id === user.id
    }
    if (need.group_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('leader_id, co_leader_id')
        .eq('id', need.group_id)
        .eq('church_id', profile.church_id)
        .single()
      isLeader = group?.leader_id === user.id || group?.co_leader_id === user.id
    }

    if (!isLeader) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: assignment, error } = await supabase
    .from('event_service_assignments')
    .upsert({
      service_need_id: needId,
      church_id: profile.church_id,
      profile_id: body.profile_id,
      assigned_by: user.id,
      status: 'assigned',
      notes: body.notes || null,
      role: body.role || null,
      role_ar: body.role_ar || null,
    }, { onConflict: 'service_need_id,profile_id' })
    .select('id, service_need_id, profile_id, status, role, role_ar, created_at')
    .single()

  if (error) throw error

  // Notify the assigned member (fire-and-forget)
  notifyEventServiceAssigned(assignment.id, profile.church_id).catch((err) =>
    logger.error('notifyEventServiceAssigned fire-and-forget failed', { module: 'events', churchId: profile.church_id, error: err })
  )

  return Response.json({ data: assignment }, { status: 201 })
})

// DELETE — remove an assignment
export const DELETE = apiHandler(async ({ req, supabase, profile, params }) => {
  const needId = params!.needId
  const body = validate(DeleteAssignmentSchema, await req.json())

  const { error } = await supabase
    .from('event_service_assignments')
    .delete()
    .eq('id', body.assignment_id)
    .eq('service_need_id', needId)
    .eq('church_id', profile.church_id)

  if (error) throw error
  return { success: true }
})
