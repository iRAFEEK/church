import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdatePrayerRequestSchema } from '@/lib/schemas/prayer'
import { createAdminClient } from '@/lib/supabase/server'

// PATCH /api/church-prayers/[id] — update prayer status
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdatePrayerRequestSchema, await req.json())

  const updates: Record<string, unknown> = {}
  if (body.status) {
    updates.status = body.status
    if (body.status === 'answered') {
      updates.resolved_at = new Date().toISOString()
    }
  }
  if (body.resolved_notes !== undefined) updates.resolved_notes = body.resolved_notes

  // Use admin client to bypass RLS
  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  const { data, error } = await dbClient
    .from('prayer_requests')
    .update(updates)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .select()
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_view_prayers'] })

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
  return { success: true }
})
