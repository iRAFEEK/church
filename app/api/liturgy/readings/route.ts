import { unstable_cache } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { ReadingsQuerySchema } from '@/lib/schemas/liturgy'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/liturgy/readings?date=YYYY-MM-DD&tradition_id=UUID
export const GET = apiHandler(async ({ req }) => {
  const url = new URL(req.url)
  const { date, tradition_id } = validate(ReadingsQuerySchema, {
    date: url.searchParams.get('date') ?? undefined,
    tradition_id: url.searchParams.get('tradition_id') ?? undefined,
  })

  // Default to today if no date provided
  const targetDate = date || new Date().toISOString().split('T')[0]
  // tradition_id is optional — if not provided, query all traditions for the date
  const cacheKey = tradition_id
    ? `liturgy-readings-${tradition_id}-${targetDate}`
    : `liturgy-readings-all-${targetDate}`

  const data = await unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      let query = supabase
        .from('lectionary_readings')
        .select('id, tradition_id, reading_date, title, title_ar, reference, reference_ar, body, body_ar, reading_type, sort_order, created_at')
        .eq('reading_date', targetDate)
        .order('sort_order', { ascending: true })
        .limit(50)

      if (tradition_id) {
        query = query.eq('tradition_id', tradition_id)
      }

      const { data: readings, error } = await query
      if (error) throw error
      return readings
    },
    [cacheKey],
    { tags: [cacheKey], revalidate: 3600 }
  )()

  return { data, date: targetDate }
}, { rateLimit: 'relaxed' })
