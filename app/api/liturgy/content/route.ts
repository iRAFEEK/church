import { unstable_cache } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ContentQuerySchema } from '@/lib/schemas/liturgy'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/liturgy/content?section_id=UUID&page=1&pageSize=50
export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url)
  const parsed = validate(ContentQuerySchema, {
    section_id: url.searchParams.get('section_id'),
    page: url.searchParams.get('page') ?? '1',
    pageSize: url.searchParams.get('pageSize') ?? '50',
  })

  const section_id = parsed.section_id
  const page = parsed.page ?? 1
  const pageSize = parsed.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const result = await unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data, error, count } = await supabase
        .from('liturgical_content')
        .select('id, section_id, content_type, title, title_ar, body, body_ar, rubric, rubric_ar, language_hint, audio_url, sort_order, created_at', { count: 'exact' })
        .eq('section_id', section_id)
        .order('sort_order', { ascending: true })
        .range(from, to)

      if (error) throw error
      return { data, count }
    },
    [`liturgy-content-${section_id}-p${page}-s${pageSize}`],
    { tags: [`liturgy-content-${section_id}`], revalidate: 3600 }
  )()

  return {
    data: result.data,
    count: result.count,
    page,
    pageSize,
    totalPages: Math.ceil((result.count || 0) / pageSize),
  }
}, { rateLimit: 'relaxed' })
