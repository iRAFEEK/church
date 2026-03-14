import { apiHandler } from '@/lib/api/handler'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/churches/search — search churches by name (used during onboarding + church switching)
// Requires auth but profile is optional (user may not have joined a church yet)
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
}, { profileOptional: true, rateLimit: 'relaxed' })
