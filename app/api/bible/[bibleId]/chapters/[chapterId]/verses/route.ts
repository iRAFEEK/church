import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChapterVerses } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/chapters/[chapterId]/verses — individual verses for presenter
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bibleId: string; chapterId: string }> }
) {
  try {
    const { bibleId, chapterId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await getChapterVerses(chapterId)
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
