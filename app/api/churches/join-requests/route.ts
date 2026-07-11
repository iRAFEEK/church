import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Two shapes of pending join awaiting a church admin:
//   • request_id → a cross-church church_join_request (an existing member of another
//     church asked to join this one). Approving inserts the active membership.
//   • user_id    → a same-church first-join self-signup, represented as a pending
//     user_churches row (migration 088). Approving flips its status to 'active'.
const respondSchema = z.union([
  z.object({ request_id: z.string().uuid(), action: z.enum(['approved', 'rejected']) }),
  z.object({ user_id: z.string().uuid(), action: z.enum(['approved', 'rejected']) }),
])

// GET /api/churches/join-requests — admins see everyone awaiting approval for their church
export const GET = apiHandler(async ({ supabase, profile }) => {
  const [requestsRes, membersRes] = await Promise.all([
    supabase
      .from('church_join_requests')
      .select('id, profile_id, status, message, created_at, requester_name, requester_name_ar, requester_phone, requester_email, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, phone)')
      .eq('church_id', profile.church_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100),
    // Same-church first-join self-signups awaiting approval. NOTE: user_churches.user_id
    // references auth.users (no FK to profiles), so PostgREST can NOT embed profiles here —
    // fetch memberships first, then the matching profiles by id (profiles.id = auth uid).
    supabase
      .from('user_churches')
      .select('user_id, joined_at')
      .eq('church_id', profile.church_id)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })
      .limit(100),
  ])

  if (requestsRes.error || membersRes.error) {
    logger.error('[/api/churches/join-requests GET]', { module: 'churches', error: requestsRes.error ?? membersRes.error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const memberIds = (membersRes.data ?? []).map((m) => m.user_id)
  let pendingMembers: unknown[] = []
  if (memberIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, phone')
      .in('id', memberIds)
    if (profErr) {
      logger.error('[/api/churches/join-requests GET] profiles fetch', { module: 'churches', error: profErr })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
    pendingMembers = (membersRes.data ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }))
  }

  return NextResponse.json({ data: requestsRes.data, pendingMembers })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// PATCH /api/churches/join-requests — admin approves/rejects; approval grants access.
export const PATCH = apiHandler(async ({ req, supabase, profile }) => {
  const body = validate(respondSchema, await req.json())

  // ── Same-church first-join self-signup (pending user_churches row) ──
  if ('user_id' in body) {
    const newStatus = body.action === 'approved' ? 'active' : 'inactive'
    const { data, error } = await supabase
      .from('user_churches')
      .update({ status: newStatus })
      .eq('user_id', body.user_id)
      .eq('church_id', profile.church_id)
      .eq('status', 'pending')
      .select('user_id, status')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
    }

    revalidateTag(`dashboard-${profile.church_id}`)
    return NextResponse.json({ data })
  }

  // ── Cross-church join request (church_join_requests) ──
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
        { user_id: request.profile_id, church_id: profile.church_id, role: 'member', status: 'active' },
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
