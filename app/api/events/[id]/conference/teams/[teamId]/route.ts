import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceTeamSchema } from '@/lib/schemas/conference-team'

// GET /api/events/[id]/conference/teams/[teamId] — team detail with counts
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId

  const { data: team, error } = await supabase
    .from('conference_teams')
    .select('id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order, created_at, updated_at')
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (error || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const [membersResult, tasksResult] = await Promise.all([
    supabase
      .from('conference_team_members')
      .select('checkin_status')
      .eq('team_id', teamId)
      .eq('church_id', profile.church_id),
    supabase
      .from('conference_tasks')
      .select('status')
      .eq('team_id', teamId)
      .eq('church_id', profile.church_id),
  ])

  type MemberStatusRow = { checkin_status: string }
  type TaskStatusRow = { status: string }

  const members = (membersResult.data || []) as MemberStatusRow[]
  const tasks = (tasksResult.data || []) as TaskStatusRow[]

  return {
    data: {
      ...team,
      total_members: members.length,
      checked_in: members.filter((m) => m.checkin_status === 'checked_in').length,
      open_tasks: tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
      blocked_tasks: tasks.filter((t) => t.status === 'blocked').length,
      done_tasks: tasks.filter((t) => t.status === 'done').length,
    },
  }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// PATCH /api/events/[id]/conference/teams/[teamId] — update team
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId
  const body = validate(conferenceTeamSchema.partial().omit({ area_id: true }), await req.json())

  const { data: team } = await supabase
    .from('conference_teams')
    .select('id')
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('conference_teams')
    .update(body)
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { data }
}, { requirePermissions: ['can_manage_conference'] })

// DELETE /api/events/[id]/conference/teams/[teamId] — delete team
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const teamId = params!.teamId

  const { data: team } = await supabase
    .from('conference_teams')
    .select('id')
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_teams')
    .delete()
    .eq('id', teamId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference'] })
