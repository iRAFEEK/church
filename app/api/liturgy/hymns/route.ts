import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { HymnSearchSchema } from '@/lib/schemas/liturgy'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/liturgy/hymns?q=...&tradition_id=...&season=...&tag=...&page=1&pageSize=25
export const GET = apiHandler(async ({ req, supabase }) => {
  const url = new URL(req.url)
  const parsed = validate(HymnSearchSchema, {
    q: url.searchParams.get('q') ?? undefined,
    tradition_id: url.searchParams.get('tradition_id') ?? undefined,
    season: url.searchParams.get('season') ?? undefined,
    tag: url.searchParams.get('tag') ?? undefined,
    page: url.searchParams.get('page') ?? '1',
    pageSize: url.searchParams.get('pageSize') ?? '25',
  })

  const { q, tradition_id, season, tag } = parsed
  const page = parsed.page ?? 1
  const pageSize = parsed.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('hymns')
    .select('id, tradition_id, title, title_ar, title_coptic, lyrics_en, lyrics_ar, lyrics_coptic, audio_url, season, occasion, tags, sort_order, metadata, created_at', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })
    .range(from, to)

  if (q) {
    const safe = sanitizeLikePattern(q)
    query = query.or(`title.ilike.%${safe}%,title_ar.ilike.%${safe}%`)
  }

  if (tradition_id) {
    query = query.eq('tradition_id', tradition_id)
  }

  if (season) {
    query = query.eq('season', season)
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}, { rateLimit: 'relaxed' })
