import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateChurchPrayerSchema } from '@/lib/schemas/prayer'
import { createAdminClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/messaging/dispatcher'

// GET /api/church-prayers — list church-wide prayer requests
export const GET = apiHandler(async ({ req, supabase, user, profile, resolvedPermissions }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'active'
  const mine = searchParams.get('mine') === 'true'
  const assigned = searchParams.get('assigned') === 'true'
  const feed = searchParams.get('feed') === 'true'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const PAGE_SIZE = 25
  const offset = (page - 1) * PAGE_SIZE

  // Use admin client for queries to bypass RLS issues in API routes
  let queryClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    queryClient = await createAdminClient()
  } catch {
    queryClient = supabase
  }

  // Helper: enrich prayers with prayer_count and is_praying
  const enrichWithPrayerCounts = async (prayers: Record<string, unknown>[]) => {
    if (prayers.length === 0) return prayers
    const prayerIds = prayers.map(p => p.id as string)

    // Get counts for all prayers in batch
    const [countsResult, userResponsesResult] = await Promise.all([
      queryClient
        .from('prayer_responses')
        .select('prayer_request_id', { count: 'exact' })
        .in('prayer_request_id', prayerIds)
        .eq('church_id', profile.church_id),
      queryClient
        .from('prayer_responses')
        .select('prayer_request_id')
        .in('prayer_request_id', prayerIds)
        .eq('profile_id', user.id)
        .eq('church_id', profile.church_id),
    ])

    // Build count map by prayer_request_id
    const countMap = new Map<string, number>()
    if (countsResult.data) {
      for (const row of countsResult.data) {
        const rid = (row as Record<string, unknown>).prayer_request_id as string
        countMap.set(rid, (countMap.get(rid) ?? 0) + 1)
      }
    }

    // Build set of prayer IDs the current user is praying for
    const userPrayingSet = new Set<string>()
    if (userResponsesResult.data) {
      for (const row of userResponsesResult.data) {
        userPrayingSet.add((row as Record<string, unknown>).prayer_request_id as string)
      }
    }

    return prayers.map(p => ({
      ...p,
      prayer_count: countMap.get(p.id as string) ?? 0,
      is_praying: userPrayingSet.has(p.id as string),
    }))
  }

  // Community feed — all non-private, non-anonymous-hidden prayers
  if (feed) {
    const isAdmin = profile.role === 'super_admin' || profile.role === 'ministry_leader'

    let query = queryClient
      .from('prayer_requests')
      .select('id, content, is_anonymous, is_private, status, resolved_at, resolved_notes, created_at, submitted_by, profiles!prayer_requests_submitted_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)', { count: 'exact' })
      .eq('church_id', profile.church_id)
      .is('group_id', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    // Regular members only see non-private prayers in feed
    if (!isAdmin) {
      query = query.eq('is_private', false)
    }

    const { data, count, error } = await query

    if (error) throw error

    // Sanitize: strip submitter info for anonymous prayers
    const sanitized = ((data ?? []) as Record<string, unknown>[]).map(p => {
      const prayer = p as Record<string, unknown> & { is_anonymous: boolean; profiles?: unknown; submitted_by?: string }
      if (prayer.is_anonymous) {
        const { profiles, submitted_by, ...rest } = prayer
        return { ...rest, submitter: null }
      }
      return { ...prayer, submitter: prayer.profiles || null, profiles: undefined }
    })

    const enriched = await enrichWithPrayerCounts(sanitized)

    return {
      data: enriched,
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      hasMore: (count ?? 0) > offset + PAGE_SIZE,
    }
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

    if (error) throw error

    // Strip submitter info for anonymous prayers
    const sanitized = ((data ?? []) as Record<string, unknown>[]).map(p => {
      const prayer = p as Record<string, unknown> & { is_anonymous: boolean; profiles?: unknown; submitted_by?: string }
      if (prayer.is_anonymous) {
        const { profiles, submitted_by, ...rest } = prayer
        return { ...rest, submitter: null }
      }
      return { ...prayer, submitter: prayer.profiles || null, profiles: undefined }
    })

    return { data: sanitized }
  }

  // If requesting own prayers, no permission needed
  if (mine) {
    const { data, count, error } = await queryClient
      .from('prayer_requests')
      .select('id, content, is_anonymous, is_private, status, resolved_at, resolved_notes, created_at', { count: 'exact' })
      .eq('church_id', profile.church_id)
      .is('group_id', null)
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error

    const enriched = await enrichWithPrayerCounts((data ?? []) as Record<string, unknown>[])

    return {
      data: enriched,
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      hasMore: (count ?? 0) > offset + PAGE_SIZE,
    }
  }

  // Admin view requires permission
  if (!resolvedPermissions.can_view_prayers) {
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

  if (error) throw error

  // Strip submitter info for anonymous prayers (unless super_admin)
  const isSuperAdmin = profile.role === 'super_admin'
  const sanitized = ((data ?? []) as Record<string, unknown>[]).map(p => {
    const prayer = p as Record<string, unknown> & { is_anonymous: boolean; profiles?: unknown; submitted_by?: string; assignee?: unknown }
    if (prayer.is_anonymous && !isSuperAdmin) {
      const { profiles, submitted_by, assignee, ...rest } = prayer
      return { ...rest, submitter: null, assignee: assignee || null }
    }
    return {
      ...prayer,
      submitter: prayer.profiles || null,
      assignee: prayer.assignee || null,
      profiles: undefined,
    }
  })

  return { data: sanitized }
})

// POST /api/church-prayers — submit a church-wide prayer request
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = validate(CreateChurchPrayerSchema, await req.json())

  // Use admin client for insert to bypass RLS
  let insertClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
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
      content: body.content.trim(),
      is_anonymous: body.is_anonymous,
      is_private: body.is_private ?? false,
      group_id: null,
      gathering_id: null,
    })
    .select('id, content, is_anonymous, status, created_at')
    .single()

  if (error) throw error

  // Notify super_admins about the new prayer request
  try {
    const adminClient = await createAdminClient()

    // Fetch profile name for notification
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, first_name_ar')
      .eq('id', user.id)
      .eq('church_id', profile.church_id)
      .single()

    const { data: admins } = await adminClient
      .from('profiles')
      .select('id')
      .eq('church_id', profile.church_id)
      .eq('role', 'super_admin')
      .neq('id', user.id)

    const submitterName = body.is_anonymous
      ? 'Anonymous'
      : (profileData?.first_name_ar || profileData?.first_name || 'Member')

    if (admins && admins.length > 0) {
      await Promise.allSettled(
        admins.map(admin =>
          sendNotification({
            profileId: admin.id,
            churchId: profile.church_id,
            type: 'general',
            titleEn: 'New Prayer Request',
            titleAr: 'طلب صلاة جديد',
            bodyEn: body.is_anonymous
              ? 'A new anonymous prayer request has been submitted.'
              : `${profileData?.first_name || 'A member'} submitted a prayer request.`,
            bodyAr: body.is_anonymous
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

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
})
