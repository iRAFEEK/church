import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceTaskSchema } from '@/lib/schemas/conference-task'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

const PAGE_SIZE = 25

// GET /api/events/[id]/conference/tasks — list tasks with filters + pagination
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const areaId = searchParams.get('area_id')
  const cardId = searchParams.get('card_id')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assigneeId = searchParams.get('assignee_id')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('conference_tasks')
    .select(
      `id, church_id, event_id, team_id, area_id, card_id,
       title, title_ar, description, description_ar,
       status, priority, assignee_id, due_at, completed_at, completed_by, created_by, created_at, updated_at,
       assignee:assignee_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)`,
      { count: 'exact' }
    )
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('priority', { ascending: false })
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (teamId) query = query.eq('team_id', teamId)
  if (areaId) query = query.eq('area_id', areaId)
  if (cardId) query = query.eq('card_id', cardId)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (assigneeId) query = query.eq('assignee_id', assigneeId)

  const { data, error, count } = await query
  if (error) throw error

  return {
    data,
    count,
    page,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  }
}, { requirePermissions: ['can_view_conference_dashboard'] })

// POST /api/events/[id]/conference/tasks — create task
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const body = validate(conferenceTaskSchema, await req.json())

  // At least one scope is required (enforced by DB constraint, but check here for a clear error)
  if (!body.team_id && !body.area_id && !body.card_id) {
    return NextResponse.json(
      { error: 'Task must be scoped to a team, area, or board card' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('conference_tasks')
    .insert({
      ...body,
      event_id: eventId,
      church_id: profile.church_id,
      created_by: user.id,
      status: body.status ?? 'open',
      priority: body.priority ?? 'normal',
    })
    .select('id, church_id, event_id, team_id, area_id, card_id, title, title_ar, status, priority, assignee_id, due_at, created_by, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)

  // Notify assignee if set
  if (body.assignee_id && data) {
    sendNotification({
      profileId: body.assignee_id,
      churchId: profile.church_id,
      type: 'conference_task_assigned',
      titleEn: 'New Task Assigned',
      titleAr: 'مهمة جديدة',
      bodyEn: `You have a new conference task: ${body.title}`,
      bodyAr: `لديك مهمة جديدة في المؤتمر: ${body.title_ar || body.title}`,
      referenceId: data.id,
      referenceType: 'conference_task',
      data: { url: `/conference/${eventId}/my-team` },
    }).catch((err) =>
      logger.error('Conference task assignment notification failed', {
        module: 'conference',
        churchId: profile.church_id,
        error: err,
      })
    )
  }

  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_conference'] })
