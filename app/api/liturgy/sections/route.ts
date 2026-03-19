import { unstable_cache } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { SectionsQuerySchema } from '@/lib/schemas/liturgy'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/liturgy/sections?category_id=UUID
export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url)
  const { category_id } = validate(SectionsQuerySchema, {
    category_id: url.searchParams.get('category_id'),
  })

  const data = await unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data: sections, error } = await supabase
        .from('liturgical_sections')
        .select('id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata')
        .eq('category_id', category_id)
        .order('sort_order', { ascending: true })
        .limit(100)

      if (error) throw error
      return sections
    },
    [`liturgy-sections-${category_id}`],
    { tags: [`liturgy-sections-${category_id}`], revalidate: 3600 }
  )()

  return { data }
}, { rateLimit: 'relaxed' })
