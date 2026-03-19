import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { HymnLyrics } from '@/components/liturgy/HymnLyrics'
import { AudioPlayer } from '@/components/liturgy/AudioPlayer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type { Hymn } from '@/types'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function HymnDetailPage({ params }: PageProps) {
  const { id } = await params
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  const { data } = await supabase
    .from('hymns')
    .select('id, tradition_id, title, title_ar, title_coptic, lyrics_en, lyrics_ar, lyrics_coptic, audio_url, season, occasion, tags, sort_order, metadata, created_at')
    .eq('id', id)
    .single()

  const hymn = data as Hymn | null
  if (!hymn) notFound()

  const title = locale === 'en' ? (hymn.title ?? hymn.title_ar) : (hymn.title_ar ?? hymn.title)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy/hymns" aria-label={t('backToHymns')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {hymn.title_coptic && (
            <p className="text-muted-foreground text-sm" dir="ltr">
              {hymn.title_coptic}
            </p>
          )}
        </div>
      </div>

      {/* Tags and season */}
      {(hymn.season || hymn.tags.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {hymn.season && (
            <Badge variant="secondary">{hymn.season}</Badge>
          )}
          {hymn.occasion && (
            <Badge variant="outline">{hymn.occasion}</Badge>
          )}
          {hymn.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Audio player */}
      {hymn.audio_url && (
        <AudioPlayer src={hymn.audio_url} title={title ?? undefined} />
      )}

      {/* Lyrics */}
      <HymnLyrics hymn={hymn} locale={locale} />
    </div>
  )
}
