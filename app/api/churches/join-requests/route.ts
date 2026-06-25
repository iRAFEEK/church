import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const respondSchema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
})

// GET /api/churches/join-requests — admins see pending requests for their church
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('church_join_requests')
    .select('id, profile_id, status, message, created_at, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, phone)')
    .eq('church_id', profile.church_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    logger.error('[/api/churches/join-requests GET]', { module: 'churches', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// PATCH /api/churches/join-requests — admin approves/rejects; approval grants membership
export const PATCH = apiHandler(async ({ req, supabase, profile }) => {
  const body = validate(respondSchema, await req.json())

  // Update the request — RLS + church_id scope ensure it's addressed to this church.
  const { data: request, error } = await supabase
    .from('church_join_requests')
    .update({
      status: body.action,
      responded_by: profile.id,
      responded_at: new Date().toISOString(),
    })
    .eq('id', body.request_id)
    .eq('church_id', profile.church_id)
    .eq('status', 'pending')
    .select('id, profile_id, status')
    .single()

  if (error || !request) {
    return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
  }

  // On approval, grant the membership (the active user_churches row).
  if (body.action === 'approved') {
    const { error: memberError } = await supabase
      .from('user_churches')
      .upsert(
        { user_id: request.profile_id, church_id: profile.church_id, role: 'member' },
        { onConflict: 'user_id,church_id' },
      )
    if (memberError) {
      logger.error('[/api/churches/join-requests PATCH] membership grant failed', { module: 'churches', error: memberError })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data: request })
}, { requireRoles: ['ministry_leader', 'super_admin'] })
