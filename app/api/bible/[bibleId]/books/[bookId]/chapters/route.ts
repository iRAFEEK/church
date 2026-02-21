import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChapters } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/books/[bookId]/chapters — list chapters for a book
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bibleId: string; bookId: string }> }
) {
  try {
    const { bibleId, bookId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await getChapters(bookId)
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
