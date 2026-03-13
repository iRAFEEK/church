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

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data })
})

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

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data })
}, { requireRoles: ['super_admin', 'ministry_leader', 'group_leader'] })

// DELETE /api/songs/[id] — delete song (admins only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  return Response.json({ success: true })
}, { requireRoles: ['super_admin'], requirePermissions: ['can_manage_songs'] })
