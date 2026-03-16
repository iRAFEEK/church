import { apiHandler } from '@/lib/api/handler'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

const PAGE_SIZE = 25

// GET /api/outreach — list congregation members with visit summaries (paginated)
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const needsFollowup = searchParams.get('needs_followup') === 'true'
  const notVisitedDays = searchParams.get('not_visited_days')
  const city = searchParams.get('city')
  const search = searchParams.get('q')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE))))

  // Fetch all active members (we need full list for stats)
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

  const memberIds = (members || []).map(m => m.id)

  if (memberIds.length === 0) {
    return { data: [], count: 0, page, pageSize, totalPages: 0, stats: { total: 0, needsVisit: 0, needsFollowup: 0 } }
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

  // Compute stats from full unfiltered results
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoffStr = thirtyDaysAgo.toISOString().split('T')[0]

  const stats = {
    total: results.length,
    needsVisit: results.filter(r => !r.last_visit_date || r.last_visit_date < cutoffStr).length,
    needsFollowup: results.filter(r => r.needs_followup).length,
  }

  // Apply filters
  if (needsFollowup) {
    results = results.filter(r => r.needs_followup)
  }

  if (notVisitedDays) {
    const days = parseInt(notVisitedDays)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const filterCutoffStr = cutoff.toISOString().split('T')[0]
    results = results.filter(r => !r.last_visit_date || r.last_visit_date < filterCutoffStr)
  }

  // Apply text search
  if (search) {
    const q = search.toLowerCase()
    results = results.filter(r => {
      const name = `${r.first_name || ''} ${r.last_name || ''} ${r.first_name_ar || ''} ${r.last_name_ar || ''}`.toLowerCase()
      const memberCity = `${r.city || ''} ${r.city_ar || ''}`.toLowerCase()
      return name.includes(q) || memberCity.includes(q)
    })
  }

  // Paginate after filtering
  const totalFiltered = results.length
  const totalPages = Math.ceil(totalFiltered / pageSize)
  const offset = (page - 1) * pageSize
  const paginatedResults = results.slice(offset, offset + pageSize)

  return {
    data: paginatedResults,
    count: totalFiltered,
    page,
    pageSize,
    totalPages,
    stats,
  }
}, { requirePermissions: ['can_manage_outreach'] })
