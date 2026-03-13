import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/outreach — list congregation members with visit summaries
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
  if (!perms.can_manage_outreach) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const needsFollowup = searchParams.get('needs_followup') === 'true'
  const notVisitedDays = searchParams.get('not_visited_days')
  const city = searchParams.get('city')

  // Fetch all active members
  let membersQuery = supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, address, address_ar, city, city_ar, photo_url, status')
    .eq('church_id', profile.church_id)
    .eq('status', 'active')
    .order('first_name')

  if (city) {
    const safeCity = sanitizeLikePattern(city)
    membersQuery = membersQuery.or(`city.ilike.%${safeCity}%,city_ar.ilike.%${safeCity}%`)
  }

  const { data: members, error: membersError } = await membersQuery

  if (membersError) {
    console.error('[/api/outreach GET]', membersError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Fetch latest visit per member + followup status
  const memberIds = (members || []).map(m => m.id)

  if (memberIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // Get all visits for these members to compute summaries
  const { data: visits } = await supabase
    .from('outreach_visits')
    .select('profile_id, visit_date, needs_followup')
    .eq('church_id', profile.church_id)
    .in('profile_id', memberIds)
    .order('visit_date', { ascending: false })

  // Build summary map
  const visitMap = new Map<string, { lastDate: string | null; needsFollowup: boolean; totalVisits: number }>()
  for (const v of (visits || []) as any[]) {
    const existing = visitMap.get(v.profile_id)
    if (!existing) {
      visitMap.set(v.profile_id, {
        lastDate: v.visit_date,
        needsFollowup: v.needs_followup,
        totalVisits: 1,
      })
    } else {
      existing.totalVisits++
      // Keep needs_followup from latest visit (already sorted desc)
    }
  }

  let results = (members || []).map(m => ({
    profile_id: m.id,
    first_name: m.first_name,
    last_name: m.last_name,
    first_name_ar: m.first_name_ar,
    last_name_ar: m.last_name_ar,
    phone: m.phone,
    address: m.address,
    address_ar: m.address_ar,
    city: m.city,
    city_ar: m.city_ar,
    photo_url: m.photo_url,
    last_visit_date: visitMap.get(m.id)?.lastDate || null,
    needs_followup: visitMap.get(m.id)?.needsFollowup || false,
    total_visits: visitMap.get(m.id)?.totalVisits || 0,
  }))

  // Apply filters
  if (needsFollowup) {
    results = results.filter(r => r.needs_followup)
  }

  if (notVisitedDays) {
    const days = parseInt(notVisitedDays)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    results = results.filter(r => !r.last_visit_date || r.last_visit_date < cutoffStr)
  }

  return NextResponse.json({ data: results })
}
