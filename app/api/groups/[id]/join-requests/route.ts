import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { notifyGroupJoinRequest } from '@/lib/messaging/triggers'

const joinRequestSchema = z.object({
  message: z.string().max(500).optional(),
})

const respondSchema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(['approved', 'rejected']),
})

// POST /api/groups/[id]/join-requests — member requests to join
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const group_id = params?.id
  if (!group_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = validate(joinRequestSchema, await req.json())

  // Check not already a member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group_id)
    .eq('profile_id', profile.id)
    .eq('is_active', true)
    .maybeSingle()

  if (existingMember) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })
  }

  // Check no pending request
  const { data: existingRequest } = await supabase
    .from('group_join_requests')
    .select('id')
    .eq('group_id', group_id)
    .eq('profile_id', profile.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingRequest) {
    return NextResponse.json({ error: 'Request already pending' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('group_join_requests')
    .insert({
      group_id,
      profile_id: profile.id,
      church_id: profile.church_id,
      message: body.message || null,
    })
    .select('id, group_id, profile_id, status, message, created_at')
    .single()

  if (error) {
    logger.error('[/api/groups/[id]/join-requests POST]', { module: 'groups', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Notify group leader (fire and forget)
  notifyGroupJoinRequest(data.id, group_id, profile.church_id)

  return NextResponse.json({ data }, { status: 201 })
})

// GET /api/groups/[id]/join-requests — leader gets pending requests
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const group_id = params?.id
  if (!group_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('group_join_requests')
    .select('id, profile_id, status, message, created_at, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)')
    .eq('group_id', group_id)
    .eq('status', 'pending')
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    logger.error('[/api/groups/[id]/join-requests GET]', { module: 'groups', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ data })
})

// PATCH /api/groups/[id]/join-requests — leader approves/rejects
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const group_id = params?.id
  if (!group_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = validate(respondSchema, await req.json())

  // Verify group belongs to church
  const { data: group } = await supabase
    .from('groups')
    .select('id, leader_id, co_leader_id')
    .eq('id', group_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check caller is leader/admin
  const isLeader = group.leader_id === profile.id || group.co_leader_id === profile.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(profile.role)
  if (!isLeader && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update request status
  const { data: request, error } = await supabase
    .from('group_join_requests')
    .update({
      status: body.action,
      responded_by: profile.id,
      responded_at: new Date().toISOString(),
    })
    .eq('id', body.request_id)
    .eq('group_id', group_id)
    .eq('status', 'pending')
    .select('id, profile_id, status')
    .single()

  if (error || !request) {
    logger.error('[/api/groups/[id]/join-requests PATCH]', { module: 'groups', error })
    return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
  }

  // If approved, add as group member
  if (body.action === 'approved') {
    const { error: memberError } = await supabase
      .from('group_members')
      .upsert({
        group_id,
        profile_id: request.profile_id,
        church_id: profile.church_id,
        role_in_group: 'member',
        is_active: true,
      }, { onConflict: 'group_id,profile_id' })

    if (memberError) {
      logger.error('[/api/groups/[id]/join-requests PATCH] member add failed', { module: 'groups', error: memberError })
    }
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data: request })
})
