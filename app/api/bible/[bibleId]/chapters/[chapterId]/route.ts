import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChapterContent } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/chapters/[chapterId] — get chapter content + user highlights
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bibleId: string; chapterId: string }> }
) {
  try {
    const { bibleId, chapterId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('church_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const chapter = await getChapterContent(bibleId, chapterId)

    const { data: highlights, error: hlError } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('profile_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('church_id', profile.church_id)

    if (hlError) {
      console.error('[/api/bible/[bibleId]/chapters/[chapterId] GET]', hlError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ data: { chapter, highlights } }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' } })
  } catch (error: any) {
    console.error('[/api/bible/[bibleId]/chapters/[chapterId] GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
