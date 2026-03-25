import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { conferenceTaskSchema } from '@/lib/schemas/conference-task'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

// PATCH /api/events/[id]/conference/tasks/[taskId] — update task
export const PATCH = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id
  const taskId = params!.taskId
  const body = validate(conferenceTaskSchema.partial(), await req.json())

  const { data: existing } = await supabase
    .from('conference_tasks')
    .select('id, status, team_id, area_id, assignee_id')
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = { ...body }

  // Auto-set completed_at/completed_by when status → done
  if (body.status === 'done' && existing.status !== 'done') {
    updatePayload.completed_at = new Date().toISOString()
    updatePayload.completed_by = user.id
  }

  const { data, error } = await supabase
    .from('conference_tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, team_id, area_id, card_id, status, priority, assignee_id, completed_at, completed_by, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)

  // If status changed to 'blocked', notify the area_director for this task's team's area
  if (body.status === 'blocked' && existing.status !== 'blocked') {
    const teamId = existing.team_id
    if (teamId) {
      ;(async () => {
        const { data: teamArea } = await supabase
          .from('conference_teams')
          .select('area_id')
          .eq('id', teamId)
          .eq('church_id', profile.church_id)
          .single()

        if (!teamArea) return

        const { data: areaDirector } = await supabase
          .from('conference_team_members')
          .select('profile_id')
          .eq('event_id', eventId)
          .eq('church_id', profile.church_id)
          .in('team_id',
            (await supabase
              .from('conference_teams')
              .select('id')
              .eq('area_id', teamArea.area_id)
              .eq('church_id', profile.church_id)
            ).data?.map((t: { id: string }) => t.id) || []
          )
          .eq('role', 'area_director')
          .limit(1)
          .single()

        if (!areaDirector) return

        await sendNotification({
          profileId: areaDirector.profile_id,
          churchId: profile.church_id,
          type: 'conference_task_blocked',
          titleEn: 'Task Blocked',
          titleAr: 'مهمة محجوبة',
          bodyEn: `A task in your area has been marked as blocked: ${body.title || 'Conference task'}`,
          bodyAr: `تم تحديد مهمة في منطقتك كمحجوبة`,
          referenceId: taskId,
          referenceType: 'conference_task',
        })
      })().catch((err) =>
        logger.error('Conference task blocked notification failed', {
          module: 'conference',
          churchId: profile.church_id,
          error: err,
        })
      )
    }
  }

  return { data }
}, { requirePermissions: ['can_manage_conference'] })

// DELETE /api/events/[id]/conference/tasks/[taskId] — delete task
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id
  const taskId = params!.taskId

  const { data: task } = await supabase
    .from('conference_tasks')
    .select('id')
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_tasks')
    .delete()
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`conference-dashboard-${eventId}`)
  return { success: true }
}, { requirePermissions: ['can_manage_conference'] })
