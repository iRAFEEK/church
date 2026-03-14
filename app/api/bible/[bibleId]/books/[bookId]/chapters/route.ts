import { apiHandler } from '@/lib/api/handler'
import { getChapters } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/books/[bookId]/chapters — list chapters for a book
// Bible data is shared reference data, no church_id filtering needed
export const GET = apiHandler(async ({ params }) => {
  const { bibleId, bookId } = params!
  const data = await getChapters(bibleId, bookId)
  return { data }
}, { cache: 'public, max-age=3600, stale-while-revalidate=86400' })
