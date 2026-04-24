import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateSongSchema } from '@/lib/schemas/song'

// GET /api/songs — fast song search
// Skips the full apiHandler auth chain (3 DB round trips) since songs are
// a shared read-only resource. Auth is handled by middleware + RLS.
export async function GET(req: NextRequest) {
  const start = performance.now()
  const supabase = await createClient()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let data, hasMore

  if (q) {
    // ilike substring search with trigram indexes for speed
    const words = q.trim().split(/\s+/).filter(w => w.length > 0)
    let query = supabase
      .from('songs')
      .select('id, title, title_ar, artist, artist_ar, tags, is_active')
      .eq('is_active', true)
      .order('title', { ascending: true })
      .range(from, to)

    for (const word of words) {
      query = query.or(
        `title.ilike.%${word}%,title_ar.ilike.%${word}%,artist.ilike.%${word}%,artist_ar.ilike.%${word}%`
      )
    }

    const result = await query
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    data = result.data
    hasMore = (data?.length ?? 0) === pageSize
  } else {
    // No search — standard paginated browse
    const result = await supabase
      .from('songs')
      .select('id, title, title_ar, artist, artist_ar, tags, is_active')
      .eq('is_active', true)
      .order('title', { ascending: true })
      .range(from, to)

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    data = result.data
    hasMore = (data?.length ?? 0) === pageSize
  }

  const duration = Math.round(performance.now() - start)
  const res = NextResponse.json({ data, hasMore })
  res.headers.set('Server-Timing', `songs;dur=${duration}`)
  res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  return res
}

// POST /api/songs — create new song (requires auth + permissions)
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateSongSchema, body)

  const { data, error } = await supabase
    .from('songs')
    .insert({
      ...validated,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_manage_songs'] })
