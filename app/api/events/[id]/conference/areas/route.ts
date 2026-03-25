import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceAreaSchema } from '@/lib/schemas/conference-area'
import type { ConferenceArea, ConferenceAreaWithChildren, ConferenceTeam } from '@/types'

type AreaRow = ConferenceArea & { teams: ConferenceTeam[] }

function buildTree(areas: AreaRow[]): ConferenceAreaWithChildren[] {
  const map = new Map<string, ConferenceAreaWithChildren>()
  const roots: ConferenceAreaWithChildren[] = []

  for (const area of areas) {
    map.set(area.id, { ...area, children: [] })
  }

  for (const area of areas) {
    const node = map.get(area.id)!
    if (area.parent_area_id && map.has(area.parent_area_id)) {
      map.get(area.parent_area_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// GET /api/events/[id]/conference/areas — full nested area tree with teams
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  const [areasResult, teamsResult] = await Promise.all([
    supabase
      .from('conference_areas')
      .select('id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order, created_at, updated_at')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('conference_teams')
      .select('id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order, created_at, updated_at')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .order('sort_order', { ascending: true }),
  ])

  if (areasResult.error) throw areasResult.error
  if (teamsResult.error) throw teamsResult.error

  const teamsByArea = new Map<string, ConferenceTeam[]>()
  for (const team of (teamsResult.data || []) as ConferenceTeam[]) {
    const existing = teamsByArea.get(team.area_id) || []
    existing.push(team)
    teamsByArea.set(team.area_id, existing)
  }

  const areasWithTeams: AreaRow[] = ((areasResult.data || []) as ConferenceArea[]).map((area) => ({
    ...area,
    teams: teamsByArea.get(area.id) || [],
  }))

  const tree = buildTree(areasWithTeams)
  return { data: tree }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// POST /api/events/[id]/conference/areas — create area
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceAreaSchema, await req.json())

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

  // If parent_area_id provided, verify it belongs to same event
  if (body.parent_area_id) {
    const { data: parentArea } = await supabase
      .from('conference_areas')
      .select('id')
      .eq('id', body.parent_area_id)
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .single()

    if (!parentArea) {
      return NextResponse.json({ error: 'Parent area not found in this event' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('conference_areas')
    .insert({
      ...body,
      event_id: eventId,
      church_id: profile.church_id,
    })
    .select('id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
