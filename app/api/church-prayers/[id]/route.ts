import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdatePrayerRequestSchema } from '@/lib/schemas/prayer'
import { createAdminClient } from '@/lib/supabase/server'

// PATCH /api/church-prayers/[id] — update prayer status
// Admins with can_view_prayers can update any prayer.
// Submitters can mark their own prayer as "answered" (self-service).
export const PATCH = apiHandler(async ({ req, supabase, user, profile, params, resolvedPermissions }) => {
  const id = params!.id
  const body = validate(UpdatePrayerRequestSchema, await req.json())

  // Use admin client to bypass RLS
  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  // Check if user is the submitter (for self-service "mark answered")
  const { data: existing } = await dbClient
    .from('prayer_requests')
    .select('submitted_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isSubmitter = existing.submitted_by === user.id
  const hasAdminPermission = resolvedPermissions.can_view_prayers

  // Submitters can only mark as answered; admins can do anything
  if (!isSubmitter && !hasAdminPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (isSubmitter && !hasAdminPermission) {
    // Submitters can only change status to 'answered'
    if (body.status && body.status !== 'answered') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (body.status) {
    updates.status = body.status
    if (body.status === 'answered') {
      updates.resolved_at = new Date().toISOString()
    }
  }
  if (body.resolved_notes !== undefined) updates.resolved_notes = body.resolved_notes

  const { data, error } = await dbClient
    .from('prayer_requests')
    .update(updates)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .select('id, church_id, group_id, submitted_by, content, is_private, status, assigned_to, resolved_at, resolved_notes, created_at, updated_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
})

// DELETE /api/church-prayers/[id] — delete a prayer request
export const DELETE = apiHandler(async ({ supabase, user, profile, params, resolvedPermissions }) => {
  const id = params!.id

  // Use admin client to bypass RLS
  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  // Check if user is the submitter
  const { data: prayer } = await dbClient
    .from('prayer_requests')
    .select('submitted_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .single()

  if (!prayer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (prayer.submitted_by !== user.id && !resolvedPermissions.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await dbClient
    .from('prayer_requests')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
})
