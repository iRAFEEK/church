import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateSongSchema } from '@/lib/schemas/song'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'
import { logger } from '@/lib/logger'

interface SongSearchRow {
  id: string
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
  tags: string[] | null
  is_active: boolean
  snippet: string | null
  total_count: number
}

// Keep only letters/digits/spaces (Unicode-aware, so Arabic survives). Punctuation
// like commas/parens/&/: would break both the PostgREST or-filter AND to_tsquery.
function sanitizeQuery(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

// GET /api/songs — fast song search
// Skips the full apiHandler auth chain (3 DB round trips) since songs are
// a shared read-only resource. Auth is handled by middleware + RLS.
export async function GET(req: NextRequest) {
  const start = performance.now()
  const supabase = await createClient()

  const { searchParams } = new URL(req.url)
  const q = sanitizeQuery(searchParams.get('q') ?? '')
  const locale = searchParams.get('locale')?.startsWith('ar') ? 'ar' : 'en'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let data, hasMore

  if (q) {
    // The RPC's WHERE is (church_id = p_church_id OR church_id IS NULL): passing null
    // would exclude ALL church-owned songs (NULL = NULL is never true), so resolve the
    // caller's church first. getSession() is a local cookie read (no network hop).
    const { data: { session } } = await supabase.auth.getSession()
    let churchId: string | null = null
    if (session?.user?.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('church_id')
        .eq('id', session.user.id)
        .single()
      churchId = prof?.church_id ?? null
    }

    // Primary: the search_songs_with_snippets RPC (migrations 067-071) — Arabic
    // normalization (hamza/tashkeel/taa-marbuta), LYRICS full-text, prefix matching
    // on the last word, and rank ordering over own-church + the global hymnal.
    // The old inline ilike here only matched title/artist, so lyric searches and
    // hamza-variant spellings silently returned nothing.
    const rpc = await supabase.rpc('search_songs_with_snippets', {
      p_church_id: churchId,
      p_query: q,
      p_locale: locale,
      p_page: page,
      p_page_size: pageSize,
    })

    if (!rpc.error) {
      const rows = (rpc.data ?? []) as SongSearchRow[]
      const total = rows[0]?.total_count ?? 0
      data = rows.map(({ id, title, title_ar, artist, artist_ar, tags, is_active, snippet }) => ({
        id, title, title_ar, artist, artist_ar, tags: tags ?? [], is_active,
        // Plain-text lyric context for the result list (RPC marks matches with <mark>)
        snippet: snippet ? snippet.replace(/<\/?mark>/g, '') : null,
      }))
      hasMore = page * pageSize < Number(total)
    } else {
      // Fallback: sanitized title/artist ilike (never 500 the search box)
      logger.warn('[/api/songs GET] search RPC failed, falling back to ilike', { module: 'songs', error: rpc.error })
      const safe = sanitizeLikePattern(q)
      const words = safe.split(/\s+/).filter(w => w.length > 0)
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
        logger.error('[/api/songs GET] search query failed', { module: 'songs', error: result.error })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
      data = result.data
      hasMore = (data?.length ?? 0) === pageSize
    }
  } else {
    // No search — standard paginated browse
    const result = await supabase
      .from('songs')
      .select('id, title, title_ar, artist, artist_ar, tags, is_active')
      .eq('is_active', true)
      .order('title', { ascending: true })
      .range(from, to)

    if (result.error) {
      logger.error('[/api/songs GET] browse query failed', { module: 'songs', error: result.error })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
