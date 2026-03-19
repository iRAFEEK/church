import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'

// POST /api/songs/[id]/publish — publish a church song to the global library
export const POST = apiHandler(async ({ supabase, profile, params }) => {
  // Verify the song belongs to this church
  const { data: song, error: fetchError } = await supabase
    .from('songs')
    .select('id, church_id')
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .single()

  if (fetchError || !song) {
    return NextResponse.json({ error: 'Song not found or not owned by your church' }, { status: 404 })
  }

  // Publish: set church_id to NULL (global) and record who published it
  const { data, error } = await supabase
    .from('songs')
    .update({
      church_id: null,
      published_by_church_id: profile.church_id,
    })
    .eq('id', params!.id)
    .select('id, title, title_ar, published_by_church_id')
    .single()

  if (error) {
    logger.error('[/api/songs/[id]/publish POST]', { module: 'songs', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}, { requireRoles: ['super_admin'] })
