import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateSongSchema } from '@/lib/schemas/song'

// GET /api/songs — list songs with optional full-text search
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('songs')
    .select('id, title, title_ar, artist, artist_ar, tags, is_active, created_at, updated_at, lyrics, lyrics_ar', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('title', { ascending: true })
    .range(from, to)

  if (q) {
    query = query.textSearch('search_vector', q, { type: 'websearch' })
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) }
})

// POST /api/songs — create new song
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
