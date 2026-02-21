import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBooks } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/books — list books for a Bible
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bibleId: string }> }
) {
  try {
    const { bibleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await getBooks()
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
