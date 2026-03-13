import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateNeedMessageSchema } from '@/lib/schemas/church-need'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyNeedMessage } from '@/lib/messaging/triggers'

// GET /api/community/needs/[id]/responses/[responseId]/messages
export const GET = apiHandler(async ({ profile, params }) => {
  const { id, responseId } = params!
  const admin = await createAdminClient()

  // Verify caller is part of this conversation (need owner or responder)
  const [{ data: response }, { data: need }] = await Promise.all([
    admin.from('church_need_responses').select('responder_church_id, need_id').eq('id', responseId).eq('need_id', id).single(),
    admin.from('church_needs').select('church_id').eq('id', id).single(),
  ])

  if (!response || !need) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isParty = need.church_id === profile.church_id || response.responder_church_id === profile.church_id
  if (!isParty) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('church_need_messages' as any)
    .select('id, response_id, sender_user_id, sender_church_id, message, message_ar, created_at, sender_church:sender_church_id(id, name, name_ar, logo_url)')
    .eq('response_id', responseId)
    .order('created_at', { ascending: true })
    .range(0, 49)

  if (error) throw error

  return { data }
}, { requirePermissions: ['can_view_church_needs'] })

// POST /api/community/needs/[id]/responses/[responseId]/messages
export const POST = apiHandler(async ({ req, user, profile, params }) => {
  const { id, responseId } = params!
  const body = await req.json()
  const validated = validate(CreateNeedMessageSchema, body)

  const admin = await createAdminClient()

  // Verify caller is part of this conversation
  const [{ data: response }, { data: need }] = await Promise.all([
    admin.from('church_need_responses').select('responder_church_id, need_id').eq('id', responseId).eq('need_id', id).single(),
    admin.from('church_needs').select('church_id').eq('id', id).single(),
  ])

  if (!response || !need) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isParty = need.church_id === profile.church_id || response.responder_church_id === profile.church_id
  if (!isParty) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('church_need_messages' as any)
    .insert({
      response_id: responseId,
      sender_user_id: user.id,
      sender_church_id: profile.church_id,
      ...validated,
    })
    .select('id, response_id, sender_user_id, sender_church_id, message, message_ar, created_at, sender_church:sender_church_id(id, name, name_ar, logo_url)')
    .single()

  if (error) throw error

  // Notify the other party (fire-and-forget)
  const recipientChurchId = profile.church_id === need.church_id
    ? response.responder_church_id
    : need.church_id
  notifyNeedMessage(id, responseId, profile.church_id, recipientChurchId, validated.message)

  return { data }
}, { requirePermissions: ['can_view_church_needs'] })
