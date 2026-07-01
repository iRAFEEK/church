import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { RespondInvitationSchema } from '@/lib/schemas/invitation'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Cross-church invitations (onboarding FIX 3). The caller is the INVITED person acting
// on their OWN 'invited' memberships — accept (-> active) or decline (delete). Every
// query is scoped to user_id = caller, so there is no IDOR: a caller can only ever see
// or change invitations addressed to themselves.
//
// createAdminClient() is used because an 'invited' membership lives in a church the
// caller has NOT joined yet, so it is invisible under the caller's church-scoped RLS.
// The route enforces the user_id = caller scope in code instead.

// GET /api/churches/invitations — list the caller's own pending invitations.
export const GET = apiHandler(async ({ user }) => {
  const admin = await createAdminClient()

  const { data, error } = await admin
    .from('user_churches')
    .select('church_id, role, joined_at, church:church_id(id, name, name_ar, country)')
    .eq('user_id', user.id)
    .eq('status', 'invited')
    .order('joined_at', { ascending: false })
    .limit(50)

  if (error) {
    logger.error('[/api/churches/invitations GET]', { module: 'churches', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
})

// PATCH /api/churches/invitations — accept: flip the caller's 'invited' row to 'active'.
export const PATCH = apiHandler(async ({ req, user }) => {
  const body = validate(RespondInvitationSchema, await req.json())
  const admin = await createAdminClient()

  const { data, error } = await admin
    .from('user_churches')
    .update({ status: 'active' })
    .eq('user_id', user.id) // self-scoped — cannot touch anyone else's rows
    .eq('church_id', body.church_id)
    .eq('status', 'invited') // only an actual pending invitation can be accepted
    .select('church_id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  revalidateTag(`members-${body.church_id}`)
  revalidateTag(`dashboard-${body.church_id}`)
  return NextResponse.json({ data: { church_id: data.church_id, status: 'active' } })
})

// DELETE /api/churches/invitations — decline: remove the caller's 'invited' row.
export const DELETE = apiHandler(async ({ req, user }) => {
  const body = validate(RespondInvitationSchema, await req.json())
  const admin = await createAdminClient()

  const { data, error } = await admin
    .from('user_churches')
    .delete()
    .eq('user_id', user.id) // self-scoped
    .eq('church_id', body.church_id)
    .eq('status', 'invited') // never delete an active membership through this route
    .select('church_id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  revalidateTag(`members-${body.church_id}`)
  return NextResponse.json({ data: { church_id: data.church_id, declined: true } })
})
