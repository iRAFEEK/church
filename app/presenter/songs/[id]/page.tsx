import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SongPresenter } from '@/components/songs/SongPresenter'

export default async function PresenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ slide?: string }>
}) {
  const { id } = await params
  const { slide } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: song } = await supabase
    .from('songs')
    .select(
      'id, church_id, created_by, title, title_ar, artist, artist_ar, lyrics, lyrics_ar, tags, display_settings, is_active, published_by_church_id, created_at, updated_at'
    )
    .eq('id', id)
    .single()

  if (!song) notFound()

  const initialSlide = slide ? parseInt(slide, 10) || 0 : 0

  return <SongPresenter song={song} initialSlide={initialSlide} />
}
