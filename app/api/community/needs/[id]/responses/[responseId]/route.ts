import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateNeedResponseStatusSchema } from '@/lib/schemas/church-need'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyNeedResponseStatusChanged } from '@/lib/messaging/triggers'

// PATCH /api/community/needs/[id]/responses/[responseId] — accept/decline/complete
export const PATCH = apiHandler(async ({ req, profile, params }) => {
  const { id, responseId } = params!
  const body = await req.json()
  const validated = validate(UpdateNeedResponseStatusSchema, body)

  // Verify the current user's church owns the need
  const admin = await createAdminClient()
  const { data: need } = await admin
    .from('church_needs')
    .select('church_id')
    .eq('id', id)
    .single()

  if (!need || need.church_id !== profile.church_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('church_need_responses')
    .update({ status: validated.status })
    .eq('id', responseId)
    .eq('need_id', id)
    .select('id, need_id, responder_church_id, responder_user_id, message, message_ar, status, created_at, updated_at')
    .single()

  if (error) throw error

  // If accepting, update need status to in_progress
  if (validated.status === 'accepted') {
    await admin
      .from('church_needs')
      .update({ status: 'in_progress' })
      .eq('id', id)
      .eq('status', 'open')
  }

  // If completing, check if all accepted responses are completed
  if (validated.status === 'completed') {
    const { count } = await admin
      .from('church_need_responses')
      .select('id', { count: 'exact', head: true })
      .eq('need_id', id)
      .eq('status', 'accepted')

    if (count === 0) {
      await admin
        .from('church_needs')
        .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
        .eq('id', id)
    }
  }

  // Notify responder about status change (fire-and-forget)
  notifyNeedResponseStatusChanged(id, responseId, validated.status)

  return { data }
}, { requirePermissions: ['can_manage_church_needs'] })
