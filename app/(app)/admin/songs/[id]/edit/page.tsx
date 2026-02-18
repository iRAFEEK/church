import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SongForm } from '@/components/songs/SongForm'
import { getTranslations } from 'next-intl/server'

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['group_leader', 'ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('songs')
  const supabase = await createClient()

  const { data: song } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single()

  if (!song) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('editSong')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{song.title}</p>
      </div>

      <SongForm song={song} />
    </div>
  )
}
