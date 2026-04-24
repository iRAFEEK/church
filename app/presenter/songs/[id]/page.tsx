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
    .select('*')
    .eq('id', id)
    .single()

  if (!song) notFound()

  const initialSlide = slide ? parseInt(slide, 10) || 0 : 0

  return <SongPresenter song={song} initialSlide={initialSlide} />
}
