import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceResourceSchema } from '@/lib/schemas/conference-resource'

const PAGE_SIZE = 25

// GET /api/events/[id]/conference/resources — list resources with filters
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const cardId = searchParams.get('card_id')
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('conference_resources')
    .select(
      `id, church_id, event_id, team_id, card_id, name, name_ar, resource_type,
       quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar,
       requested_by, fulfilled_by, fulfilled_at, created_at, updated_at`,
      { count: 'exact' }
    )
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (teamId) query = query.eq('team_id', teamId)
  if (cardId) query = query.eq('card_id', cardId)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) throw error

  return {
    data,
    count,
    page,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// POST /api/events/[id]/conference/resources — create resource
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceResourceSchema, await req.json())

  // At least one of team_id or card_id required
  if (!body.team_id && !body.card_id) {
    return NextResponse.json(
      { error: 'Resource must be scoped to a team or board card' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('conference_resources')
    .insert({
      ...body,
      event_id: eventId,
      church_id: profile.church_id,
      requested_by: user.id,
      status: body.status ?? 'needed',
    })
    .select('id, church_id, event_id, team_id, card_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
