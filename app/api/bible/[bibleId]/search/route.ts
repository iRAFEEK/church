import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchBible } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/search?query=...&limit=20&offset=0
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bibleId: string }> }
) {
  try {
    const { bibleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')
    if (!query) return NextResponse.json({ error: 'query parameter is required' }, { status: 400 })

    const limit = parseInt(searchParams.get('limit') || '10')

    const data = await searchBible(query, limit)
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
