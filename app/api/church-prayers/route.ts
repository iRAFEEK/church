import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { sendNotification } from '@/lib/messaging/dispatcher'

// GET /api/church-prayers — list church-wide prayer requests
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'active'
  const mine = searchParams.get('mine') === 'true'
  const assigned = searchParams.get('assigned') === 'true'

  // Use admin client for queries to bypass RLS issues in API routes
  let queryClient: any
  try {
    queryClient = await createAdminClient()
  } catch {
    queryClient = supabase
  }

  // Prayers assigned to the current user — no special permission needed
  if (assigned) {
    const { data, error } = await queryClient
      .from('prayer_requests')
      .select('id, content, is_anonymous, status, resolved_at, resolved_notes, assigned_to, created_at, submitted_by, profiles!prayer_requests_submitted_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)')
      .eq('church_id', profile.church_id)
      .is('group_id', null)
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Strip submitter info for anonymous prayers
    const sanitized = (data as any[] || []).map(p => {
      if (p.is_anonymous) {
        const { profiles, submitted_by, ...rest } = p
        return { ...rest, submitter: null }
      }
      return { ...p, submitter: p.profiles || null, profiles: undefined }
    })

    return NextResponse.json({ data: sanitized })
  }

  // If requesting own prayers, no permission needed
  if (mine) {
    const { data, error } = await queryClient
      .from('prayer_requests')
      .select('id, content, is_anonymous, status, resolved_at, resolved_notes, created_at')
      .eq('church_id', profile.church_id)
      .is('group_id', null)
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Admin view requires permission
  if (!perms.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await queryClient
    .from('prayer_requests')
    .select('id, content, is_anonymous, is_private, status, resolved_at, resolved_notes, assigned_to, created_at, submitted_by, profiles!prayer_requests_submitted_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url), assignee:profiles!prayer_requests_assigned_to_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)')
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Strip submitter info for anonymous prayers (unless super_admin)
  const isSuperAdmin = profile.role === 'super_admin'
  const sanitized = (data as any[]).map(p => {
    if (p.is_anonymous && !isSuperAdmin) {
      const { profiles, submitted_by, assignee, ...rest } = p
      return { ...rest, submitter: null, assignee: assignee || null }
    }
    return {
      ...p,
      submitter: p.profiles || null,
      assignee: p.assignee || null,
      profiles: undefined,
    }
  })

  return NextResponse.json({ data: sanitized })
}

// POST /api/church-prayers — submit a church-wide prayer request
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, first_name, first_name_ar')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { content, is_anonymous } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  // Use admin client for insert to bypass RLS
  let insertClient: any
  try {
    insertClient = await createAdminClient()
  } catch {
    insertClient = supabase
  }

  const { data, error } = await insertClient
    .from('prayer_requests')
    .insert({
      church_id: profile.church_id,
      submitted_by: user.id,
      content: content.trim(),
      is_anonymous: is_anonymous || false,
      is_private: false,
      group_id: null,
      gathering_id: null,
    })
    .select('id, content, is_anonymous, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify super_admins about the new prayer request
  try {
    const adminClient = await createAdminClient()
    const { data: admins } = await adminClient
      .from('profiles')
      .select('id')
      .eq('church_id', profile.church_id)
      .eq('role', 'super_admin')
      .neq('id', user.id)

    const submitterName = is_anonymous
      ? 'Anonymous'
      : (profile.first_name_ar || profile.first_name || 'Member')

    if (admins && admins.length > 0) {
      await Promise.allSettled(
        admins.map(admin =>
          sendNotification({
            profileId: admin.id,
            churchId: profile.church_id,
            type: 'general',
            titleEn: 'New Prayer Request',
            titleAr: 'طلب صلاة جديد',
            bodyEn: is_anonymous
              ? 'A new anonymous prayer request has been submitted.'
              : `${profile.first_name || 'A member'} submitted a prayer request.`,
            bodyAr: is_anonymous
              ? 'تم تقديم طلب صلاة مجهول جديد.'
              : `${submitterName} قدّم طلب صلاة.`,
            referenceId: data.id,
            referenceType: 'prayer_request',
          })
        )
      )
    }
  } catch {
    // Don't fail the request if notifications fail
  }

  return NextResponse.json({ data }, { status: 201 })
}
