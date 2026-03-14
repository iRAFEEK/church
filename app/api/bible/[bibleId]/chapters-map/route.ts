import { apiHandler } from '@/lib/api/handler'
import { getAllChaptersMap } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/chapters-map — all chapters grouped by book
// Bible data is shared reference data, no church_id filtering needed
export const GET = apiHandler(async ({ params }) => {
  const bibleId = params!.bibleId
  const data = await getAllChaptersMap(bibleId)
  return { data }
}, { cache: 'public, max-age=3600, stale-while-revalidate=86400' })
