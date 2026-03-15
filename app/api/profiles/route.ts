import { apiHandler } from '@/lib/api/handler'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/profiles — list members (admin only, paginated)
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)

  // Pagination
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '25'), 100)
  const offset = (page - 1) * pageSize

  // Filters
  const search = searchParams.get('q')
  const role = searchParams.get('role')
  const status = searchParams.get('status')

  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, status, gender, photo_url, joined_church_at, created_at', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    const { normalizeSearch } = await import('@/lib/utils/normalize')
    const escaped = sanitizeLikePattern(search)
    const normalized = normalizeSearch(escaped)
    const base = `first_name_ar.ilike.%${escaped}%,last_name_ar.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
    const extra = normalized !== escaped
      ? `,first_name_ar.ilike.%${normalized}%,last_name_ar.ilike.%${normalized}%,first_name.ilike.%${normalized}%,last_name.ilike.%${normalized}%`
      : ''
    query = query.or(base + extra)
  }
  if (role) query = query.eq('role', role)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) throw error

  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}, {
  requireRoles: ['ministry_leader', 'super_admin'],
  cache: 'private, max-age=30, stale-while-revalidate=120',
})
