import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateNeedResponseSchema } from '@/lib/schemas/church-need'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyNeedResponseReceived } from '@/lib/messaging/triggers'

// GET /api/community/needs/[id]/responses — list responses
export const GET = apiHandler(async ({ profile, params }) => {
  const { id } = params!
  const admin = await createAdminClient()

  // Check if current user's church owns this need
  const { data: need } = await admin
    .from('church_needs')
    .select('church_id')
    .eq('id', id)
    .single()

  if (!need) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOwner = need.church_id === profile.church_id

  let query = admin
    .from('church_need_responses')
    .select(
      'id, need_id, responder_church_id, responder_user_id, message, message_ar, status, created_at, updated_at, responder_church:responder_church_id(id, name, name_ar, country, logo_url)'
    )
    .eq('need_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Non-owners can only see their own response
  if (!isOwner) {
    query = query.eq('responder_church_id', profile.church_id)
  }

  const { data, error } = await query
  if (error) throw error

  return { data, isOwner }
}, { requirePermissions: ['can_view_church_needs'] })

// POST /api/community/needs/[id]/responses — submit an offer
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const { id } = params!
  const body = await req.json()
  const validated = validate(CreateNeedResponseSchema, body)

  // Verify the need exists and is open
  const admin = await createAdminClient()
  const { data: need } = await admin
    .from('church_needs')
    .select('church_id, status')
    .eq('id', id)
    .single()

  if (!need) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (need.status !== 'open' && need.status !== 'in_progress') {
    return NextResponse.json({ error: 'This need is no longer accepting responses' }, { status: 400 })
  }

  // Prevent self-response
  if (need.church_id === profile.church_id) {
    return NextResponse.json({ error: 'Cannot respond to your own church\'s need' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('church_need_responses')
    .insert({
      need_id: id,
      responder_church_id: profile.church_id,
      responder_user_id: user.id,
      ...validated,
    })
    .select('id, need_id, responder_church_id, responder_user_id, message, message_ar, status, created_at')
    .single()

  if (error) {
    // Unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Your church has already responded to this need' }, { status: 409 })
    }
    throw error
  }

  // Notify need owner (fire-and-forget)
  notifyNeedResponseReceived(id, profile.church_id, validated.message || '')

  return { data }
}, { requirePermissions: ['can_view_church_needs'] })
