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

    const chapter = await getChapterContent(chapterId)

    const { data: highlights, error: hlError } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('profile_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('church_id', profile.church_id)

    if (hlError) return NextResponse.json({ error: hlError.message }, { status: 500 })

    return NextResponse.json({ data: { chapter, highlights } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
