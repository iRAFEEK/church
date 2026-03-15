import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SongPresenter } from '@/components/songs/SongPresenter'
import { getCurrentUserWithRole } from '@/lib/auth'

export default async function PresenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await getCurrentUserWithRole()
  const supabase = await createClient()

  const { data: song } = await supabase
    .from('songs')
    .select('id, church_id, title, title_ar, lyrics, lyrics_ar, display_settings, tags, artist, artist_ar, is_active, created_at, updated_at, created_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (!song) notFound()

  return <SongPresenter song={song} />
}
