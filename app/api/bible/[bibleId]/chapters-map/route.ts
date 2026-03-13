import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllChaptersMap } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/chapters-map — all chapters grouped by book
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bibleId: string }> }
) {
  try {
    const { bibleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await getAllChaptersMap(bibleId)
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    })
  } catch (error: any) {
    console.error('[/api/bible/[bibleId]/chapters-map GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
