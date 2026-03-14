import { apiHandler } from '@/lib/api/handler'
import { getChapterContent } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/chapters/[chapterId] — get chapter content + user highlights
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const { bibleId, chapterId } = params!

  const [chapter, highlightsRes] = await Promise.all([
    getChapterContent(bibleId, chapterId),
    supabase
      .from('bible_highlights')
      .select('id, verse_id, color')
      .eq('profile_id', profile.id)
      .eq('chapter_id', chapterId)
      .eq('church_id', profile.church_id),
  ])

  if (highlightsRes.error) throw highlightsRes.error

  return { data: { chapter, highlights: highlightsRes.data } }
}, { cache: 'private, max-age=30, stale-while-revalidate=300' })
