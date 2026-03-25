import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'

const updateMemberSchema = z.object({
  role: z.enum(['conference_director', 'area_director', 'team_leader', 'sub_leader', 'volunteer']).optional(),
  shift_start: z.string().datetime().optional().nullable(),
  shift_end: z.string().datetime().optional().nullable(),
  checkin_status: z.enum(['not_arrived', 'checked_in', 'checked_out', 'no_show']).optional(),
  task_notes: z.string().max(1000).optional().nullable(),
})

// PATCH /api/events/[id]/conference/teams/[teamId]/members/[memberId]
export const PATCH = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId
  const memberId = params!.memberId
  const body = validate(updateMemberSchema, await req.json())

  const { data: member } = await supabase
    .from('conference_team_members')
    .select('id, profile_id, role')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .eq('church_id', profile.church_id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const isAdmin = profile.role === 'super_admin' || profile.role === 'ministry_leader'
  const isSelf = member.profile_id === user.id

  // Volunteers can only update their own checkin_status
  if (!isAdmin) {
    if (!isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Only checkin_status allowed for self
    const allowedSelfFields = new Set<string>(['checkin_status'])
    const requestedFields = Object.keys(body).filter((k) => body[k as keyof typeof body] !== undefined)
    const forbidden = requestedFields.filter((f) => !allowedSelfFields.has(f))
    if (forbidden.length > 0) {
      return NextResponse.json({ error: 'Volunteers may only update checkin_status' }, { status: 403 })
    }
  }

  // Build update payload — only role change is admin-restricted
  const updatePayload: Record<string, unknown> = {}
  if (body.checkin_status !== undefined) updatePayload.checkin_status = body.checkin_status
  if (body.task_notes !== undefined) updatePayload.task_notes = body.task_notes
  if (isAdmin) {
    if (body.role !== undefined) updatePayload.role = body.role
    if (body.shift_start !== undefined) updatePayload.shift_start = body.shift_start
    if (body.shift_end !== undefined) updatePayload.shift_end = body.shift_end
  }

  const { data, error } = await supabase
    .from('conference_team_members')
    .update(updatePayload)
    .eq('id', memberId)
    .eq('team_id', teamId)
    .eq('church_id', profile.church_id)
    .select('id, profile_id, team_id, role, shift_start, shift_end, checkin_status, checked_in_at, checked_out_at, task_notes, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
})

// DELETE /api/events/[id]/conference/teams/[teamId]/members/[memberId]
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId
  const memberId = params!.memberId

  const { data: member } = await supabase
    .from('conference_team_members')
    .select('id')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .eq('church_id', profile.church_id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_team_members')
    .delete()
    .eq('id', memberId)
    .eq('team_id', teamId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference_teams'] })
