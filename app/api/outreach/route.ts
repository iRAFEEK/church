import { apiHandler } from '@/lib/api/handler'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/outreach — list congregation members with visit summaries
export const GET = apiHandler(async ({ req, supabase, profile }) => {
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

  if (membersError) throw membersError

  // Fetch latest visit per member + followup status
  const memberIds = (members || []).map(m => m.id)

  if (memberIds.length === 0) {
    return { data: [] }
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
  for (const v of (visits || []) as Array<{ profile_id: string; visit_date: string; needs_followup: boolean }>) {
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

  return { data: results }
}, { requirePermissions: ['can_manage_outreach'] })
