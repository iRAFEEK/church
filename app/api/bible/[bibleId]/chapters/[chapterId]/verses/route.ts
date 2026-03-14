import { apiHandler } from '@/lib/api/handler'
import { getChapterVerses } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/chapters/[chapterId]/verses — individual verses for presenter
// Bible data is shared reference data, no church_id filtering needed
export const GET = apiHandler(async ({ params }) => {
  const { bibleId, chapterId } = params!
  const data = await getChapterVerses(bibleId, chapterId)
  return { data }
}, { cache: 'public, max-age=3600, stale-while-revalidate=86400' })
