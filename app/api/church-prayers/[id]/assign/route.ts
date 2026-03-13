import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { sendNotification } from '@/lib/messaging/dispatcher'

type Params = { params: Promise<{ id: string }> }

// POST — Assign prayer to a member
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { assigned_to } = await req.json()
  if (!assigned_to) {
    return NextResponse.json({ error: 'assigned_to is required' }, { status: 400 })
  }

  let dbClient: any
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  // Update prayer request
  const { data, error } = await dbClient
    .from('prayer_requests')
    .update({ assigned_to })
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .select('id, content, assigned_to, is_anonymous, submitted_by')
    .single()

  if (error) {
    console.error('[/api/church-prayers/[id]/assign POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Notify the assigned member
  try {
    await sendNotification({
      profileId: assigned_to,
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

  return NextResponse.json({ data })
}

// DELETE — Unassign prayer
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let dbClient: any
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

  if (error) {
    console.error('[/api/church-prayers/[id]/assign DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
