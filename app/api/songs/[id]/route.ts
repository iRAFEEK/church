import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateSongSchema } from '@/lib/schemas/song'
import { NextResponse } from 'next/server'

// GET /api/songs/[id] — get song detail
export const GET = apiHandler(async ({ supabase, params }) => {
  const { data, error } = await supabase
    .from('songs')
    .select(
      'id, church_id, created_by, title, title_ar, artist, artist_ar, lyrics, lyrics_ar, tags, display_settings, is_active, published_by_church_id, created_at, updated_at'
    )
    .eq('id', params!.id)
    .single()

  if (error) throw error
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return { data }
})

// PATCH /api/songs/[id] — update song (leaders+)
export const PATCH = apiHandler(async ({ req, supabase, params }) => {
  const body = await req.json()
  const validated = validate(UpdateSongSchema, body)

  const { data, error } = await supabase
    .from('songs')
    .update(validated)
    .eq('id', params!.id)
    .select()
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_manage_songs'] })

// DELETE /api/songs/[id] — delete song (admins only)
export const DELETE = apiHandler(async ({ supabase, params }) => {
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', params!.id)

  if (error) throw error
  return { success: true }
}, { requirePermissions: ['can_manage_songs'] })
