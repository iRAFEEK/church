import { apiHandler } from '@/lib/api/handler'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/churches/search — search churches by name (used during signup, onboarding + church
// switching). PUBLIC: /signup runs logged-out, so no auth is required (middleware allows the
// path and migration 089 grants anon SELECT on ACTIVE churches — name/logo/country only, no
// member data). Staging walkthrough 2026-07-11 caught the regression: middleware redirected
// unauthenticated search to /login, so logged-out signup could never find a church.
export const GET = apiHandler(async ({ req, supabase }) => {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  const query = supabase
    .from('churches')
    .select('id, name, name_ar, country, logo_url, denomination')
    .eq('is_active', true)
    .limit(10)

  if (q.length > 0) {
    const safe = sanitizeLikePattern(q)
    query.or(`name.ilike.%${safe}%,name_ar.ilike.%${safe}%`)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) throw error

  return Response.json(data ?? [])
}, { requireAuth: false, rateLimit: 'relaxed' })
