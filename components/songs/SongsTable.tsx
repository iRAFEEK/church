'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Music } from 'lucide-react'
import { ListShimmer } from '@/components/ui/list-shimmer'
import type { Song } from '@/types'

export function SongsTable() {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Load all songs once on mount
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/songs?pageSize=500')
      if (res.ok) {
        const json = await res.json()
        setAllSongs(json.data || [])
      }
      setLoading(false)
    })()
  }, [])

  // Instant client-side filtering
  const filtered = useMemo(() => {
    if (!search.trim()) return allSongs
    const q = search.toLowerCase()
    return allSongs.filter(song =>
      song.title.toLowerCase().includes(q) ||
      (song.title_ar && song.title_ar.includes(search)) ||
      (song.artist && song.artist.toLowerCase().includes(q)) ||
      (song.artist_ar && song.artist_ar.includes(search)) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(q)) ||
      (song.lyrics_ar && song.lyrics_ar.includes(search)) ||
      (song.tags && song.tags.some(tag => tag.toLowerCase().includes(q)))
    )
  }, [allSongs, search])

  const getSlideCount = (lyrics: string | null) => {
    if (!lyrics) return 0
    return lyrics.split(/\n\s*\n/).filter(s => s.trim()).length
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {loading ? (
        <ListShimmer count={6} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? t('noSearchResults') : t('noSongs')}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((song) => {
            const title = isAr ? (song.title_ar || song.title) : song.title
            const artist = isAr ? (song.artist_ar || song.artist) : song.artist
            const slideCount = getSlideCount(isAr ? (song.lyrics_ar || song.lyrics) : song.lyrics)

            return (
              <Link
                key={song.id}
                href={`/admin/songs/${song.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{title}</p>
                  {artist && (
                    <p className="text-sm text-muted-foreground truncate">{artist}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {slideCount > 0 && (
                    <Badge variant="secondary">{slideCount} {t('slides')}</Badge>
                  )}
                  {song.tags?.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
