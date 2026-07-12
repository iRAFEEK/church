import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateOutreachAssignmentSchema } from '@/lib/schemas/outreach-assignment'
import { notifyOutreachVisitAssigned } from '@/lib/messaging/triggers'
import { logger } from '@/lib/logger'

const PAGE_SIZE = 25

// GET /api/outreach/assignments — list assignments
// Managers (can_manage_outreach) see all assignments; others see only their own
export const GET = apiHandler(async ({ req, supabase, profile, resolvedPermissions }) => {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('member_id')
  const assignedTo = searchParams.get('assigned_to')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const offset = (page - 1) * PAGE_SIZE
  const churchId = profile.church_id
  const canManage = resolvedPermissions.can_manage_outreach

  // Non-managers can only see their own assignments
  if (!canManage && assignedTo !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('outreach_assignments')
    .select(`
      id, member_id, assigned_to, assigned_by, notes, status, created_at, updated_at,
      member:profiles!outreach_assignments_member_id_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      assignee:profiles!outreach_assignments_assigned_to_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      assigner:profiles!outreach_assignments_assigned_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar)
    `, { count: 'exact' })
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (memberId) {
    query = query.eq('member_id', memberId)
  }
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  const { data, count, error } = await query
  if (error) throw error

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (count ?? 0) > offset + PAGE_SIZE,
  }
})

// POST /api/outreach/assignments — create assignment
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = validate(CreateOutreachAssignmentSchema, await req.json())
  const churchId = profile.church_id

  // Verify member and assignee belong to this church
  const [memberResult, assigneeResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar')
      .eq('id', body.member_id)
      .eq('church_id', churchId)
      .single(),
    supabase
      .from('profiles')
      .select('id')
      .eq('id', body.assigned_to)
      .eq('church_id', churchId)
      .single(),
  ])

  if (!memberResult.data) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
  if (!assigneeResult.data) {
    return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('outreach_assignments')
    .insert({
      church_id: churchId,
      member_id: body.member_id,
      assigned_to: body.assigned_to,
      assigned_by: profile.id,
      notes: body.notes || null,
    })
    .select('id, member_id, assigned_to, assigned_by, notes, status, created_at')
    .single()

  if (error) throw error

  // Notify the assignee (fire-and-forget — localized in-app + push via the dispatcher).
  // Replaces the old manual notifications_log insert: sendNotification writes the
  // in-app row itself, so calling both would double-notify.
  notifyOutreachVisitAssigned(data.id, body.member_id, body.assigned_to, churchId).catch((err) =>
    logger.error('Failed to send outreach assignment notification', {
      module: 'outreach',
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  )

  revalidateTag(`outreach-${churchId}`)
  revalidateTag(`dashboard-${churchId}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_outreach'] })
