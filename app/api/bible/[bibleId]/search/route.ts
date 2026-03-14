import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { searchBible } from '@/lib/bible/queries'

// GET /api/bible/[bibleId]/search?query=...&limit=20
// Bible search is shared reference data, no church_id filtering needed
export const GET = apiHandler(async ({ req, params }) => {
  const bibleId = params!.bibleId

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')
  if (!query) {
    return NextResponse.json({ error: 'query parameter is required' }, { status: 400 })
  }

  const limit = parseInt(searchParams.get('limit') || '10')

  const data = await searchBible(bibleId, query, limit)
  return { data }
}, { cache: 'private, max-age=60, stale-while-revalidate=300' })
