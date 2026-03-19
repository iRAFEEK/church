import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'

// GET /api/liturgy/hymns/[id]
export const GET = apiHandler(async ({ supabase, params }) => {
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: 'Missing hymn id' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('liturgical_hymns')
    .select('id, tradition_id, title, title_ar, lyrics, lyrics_ar, audio_url, season, tags, sort_order, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return { data }
}, { rateLimit: 'relaxed' })
