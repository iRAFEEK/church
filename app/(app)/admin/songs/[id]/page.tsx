import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { Pencil, Presentation, Trash2 } from 'lucide-react'
import { SongDeleteButton } from './SongDeleteButton'

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('songs')
  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value || 'ar'
  const isAr = lang === 'ar'

  const supabase = await createClient()
  const { data: song } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single()

  if (!song) notFound()

  const title = isAr ? (song.title_ar || song.title) : song.title
  const artist = isAr ? (song.artist_ar || song.artist) : song.artist
  const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : song.lyrics
  const slides = lyrics ? lyrics.split(/\n\s*\n/).filter((s: string) => s.trim()) : []

  const isAdmin = ['ministry_leader', 'super_admin'].includes(user.profile.role)
  const isLeader = ['group_leader', 'ministry_leader', 'super_admin'].includes(user.profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          {artist && <p className="text-sm text-zinc-500 mt-1">{artist}</p>}
        </div>
        <div className="flex items-center gap-2">
          {lyrics && (
            <a href={`/presenter/songs/${song.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="default">
                <Presentation className="h-4 w-4 me-2" />
                {t('present')}
              </Button>
            </a>
          )}
          {isLeader && (
            <Link href={`/admin/songs/${song.id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 me-2" />
                {t('edit')}
              </Button>
            </Link>
          )}
          {isAdmin && (
            <SongDeleteButton songId={song.id} songTitle={title} />
          )}
        </div>
      </div>

      {/* Tags */}
      {song.tags && song.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {song.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Lyrics preview as slides */}
      {slides.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('lyricsPreview')} ({slides.length} {t('slides')})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide: string, i: number) => (
              <div
                key={i}
                className="p-4 rounded-lg border bg-zinc-50 text-center"
              >
                <div className="text-xs text-muted-foreground mb-2">{t('slide')} {i + 1}</div>
                <p className="whitespace-pre-line text-sm" dir={isAr ? 'rtl' : 'ltr'}>{slide}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {t('noLyrics')}
        </div>
      )}
    </div>
  )
}
