import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SongPresenter } from '@/components/songs/SongPresenter'
import { getCurrentUserWithRole } from '@/lib/auth'

export default async function PresenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ slide?: string }>
}) {
  const { id } = await params
  const { slide } = await searchParams
  const { profile } = await getCurrentUserWithRole()
  const supabase = await createClient()

  const { data: song } = await supabase
    .from('songs')
    .select('id, church_id, title, title_ar, lyrics, lyrics_ar, display_settings, tags, artist, artist_ar, is_active, created_at, updated_at, created_by')
    .eq('id', id)
    .or(`church_id.eq.${profile.church_id},church_id.is.null`)
    .single()

  if (!song) notFound()

  const initialSlide = slide ? parseInt(slide, 10) || 0 : 0

  return <SongPresenter song={song} initialSlide={initialSlide} />
}
