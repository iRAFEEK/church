import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { AssignPrayerSchema } from '@/lib/schemas/prayer'
import { createAdminClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/messaging/dispatcher'

// POST — Assign prayer to a member
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(AssignPrayerSchema, await req.json())

  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  // Update prayer request
  const { data, error } = await dbClient
    .from('prayer_requests')
    .update({ assigned_to: body.assigned_to })
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .select('id, content, assigned_to, is_anonymous, submitted_by')
    .single()

  if (error) throw error
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Notify the assigned member
  try {
    await sendNotification({
      profileId: body.assigned_to,
      churchId: profile.church_id,
      type: 'general',
      titleEn: 'Prayer Request Assigned',
      titleAr: 'تم تعيين طلب صلاة لك',
      bodyEn: 'A prayer request has been assigned to you for follow-up.',
      bodyAr: 'تم تعيين طلب صلاة لك للمتابعة.',
      referenceId: id,
      referenceType: 'prayer_request',
    })
  } catch {
    // Don't fail the request if notification fails
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_view_prayers'] })

// DELETE — Unassign prayer
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  const { error } = await dbClient
    .from('prayer_requests')
    .update({ assigned_to: null })
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_view_prayers'] })
