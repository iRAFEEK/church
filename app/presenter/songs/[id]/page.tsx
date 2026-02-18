import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SongPresenter } from '@/components/songs/SongPresenter'

export default async function PresenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check — must be logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: song } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single()

  if (!song) notFound()

  return <SongPresenter song={song} />
}
