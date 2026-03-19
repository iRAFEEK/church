import { unstable_cache } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CategoriesQuerySchema } from '@/lib/schemas/liturgy'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/liturgy/categories?tradition_id=UUID
export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url)
  const { tradition_id } = validate(CategoriesQuerySchema, {
    tradition_id: url.searchParams.get('tradition_id'),
  })

  const data = await unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data: categories, error } = await supabase
        .from('liturgical_categories')
        .select('id, tradition_id, name, name_ar, description, description_ar, icon, sort_order, created_at')
        .eq('tradition_id', tradition_id)
        .order('sort_order', { ascending: true })
        .limit(100)

      if (error) throw error
      return categories
    },
    [`liturgy-categories-${tradition_id}`],
    { tags: [`liturgy-categories-${tradition_id}`], revalidate: 3600 }
  )()

  return { data }
}, { rateLimit: 'relaxed' })
