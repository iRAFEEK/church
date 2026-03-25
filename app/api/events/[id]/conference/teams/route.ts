import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceTeamSchema } from '@/lib/schemas/conference-team'

const PAGE_SIZE = 25

// GET /api/events/[id]/conference/teams — list teams with member count + task summary
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const { searchParams } = new URL(req.url)
  const areaId = searchParams.get('area_id')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('conference_teams')
    .select('id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order, created_at, updated_at', { count: 'exact' })
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('sort_order', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (areaId) query = query.eq('area_id', areaId)

  const { data: teams, error, count } = await query
  if (error) throw error

  if (!teams || teams.length === 0) {
    return { data: [], count: 0, page, totalPages: 0 }
  }

  const teamIds = teams.map((t) => t.id)

  // Fetch member counts and task summaries in parallel
  const [membersResult, tasksResult] = await Promise.all([
    supabase
      .from('conference_team_members')
      .select('team_id, checkin_status')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .in('team_id', teamIds),
    supabase
      .from('conference_tasks')
      .select('team_id, status')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .in('team_id', teamIds),
  ])

  type MemberRow = { team_id: string; checkin_status: string }
  type TaskRow = { team_id: string; status: string }

  const membersByTeam = new Map<string, MemberRow[]>()
  for (const m of (membersResult.data || []) as MemberRow[]) {
    const arr = membersByTeam.get(m.team_id) || []
    arr.push(m)
    membersByTeam.set(m.team_id, arr)
  }

  const tasksByTeam = new Map<string, TaskRow[]>()
  for (const t of (tasksResult.data || []) as TaskRow[]) {
    if (!t.team_id) continue
    const arr = tasksByTeam.get(t.team_id) || []
    arr.push(t)
    tasksByTeam.set(t.team_id, arr)
  }

  const enriched = teams.map((team) => {
    const members = membersByTeam.get(team.id) || []
    const tasks = tasksByTeam.get(team.id) || []
    return {
      ...team,
      total_members: members.length,
      checked_in: members.filter((m) => m.checkin_status === 'checked_in').length,
      open_tasks: tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
      blocked_tasks: tasks.filter((t) => t.status === 'blocked').length,
    }
  })

  return {
    data: enriched,
    count,
    page,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// POST /api/events/[id]/conference/teams — create team
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceTeamSchema, await req.json())

  // Verify event belongs to this church
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Verify area belongs to this event + church
  const { data: area } = await supabase
    .from('conference_areas')
    .select('id')
    .eq('id', body.area_id)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!area) {
    return NextResponse.json({ error: 'Area not found in this event' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('conference_teams')
    .insert({
      ...body,
      event_id: eventId,
      church_id: profile.church_id,
    })
    .select('id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
