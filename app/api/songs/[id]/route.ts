import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateSongSchema } from '@/lib/schemas/song'

// GET /api/songs/[id] — get song detail
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, title_ar, artist, artist_ar, lyrics, lyrics_ar, tags, display_settings, is_active, created_at')
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/songs/[id] GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data })
}

// PATCH /api/songs/[id] — update song (leaders+)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(UpdateSongSchema, await req.json())

  const { data, error } = await supabase
    .from('songs')
    .update(body)
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .select('id, title, title_ar, artist, artist_ar, lyrics, lyrics_ar, tags, display_settings, is_active')
    .single()

  if (error) {
    console.error('[/api/songs/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE /api/songs/[id] — delete song (admins only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('[/api/songs/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
