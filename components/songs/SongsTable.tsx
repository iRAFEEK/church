'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { SearchInput } from '@/components/ui/search-input'
import { Badge } from '@/components/ui/badge'
import { Music } from 'lucide-react'
import { ListShimmer } from '@/components/ui/list-shimmer'
import { normalizeSearch } from '@/lib/utils/search'
import { useRouter } from 'next/navigation'
import type { Song } from '@/types'

export function SongsTable() {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()

  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Load all songs once on mount
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/api/songs?pageSize=500', { signal: controller.signal })
        if (res.ok) {
          const json = await res.json()
          if (!controller.signal.aborted) {
            setAllSongs(json.data || [])
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[SongsTable] Failed to fetch:', e)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    })()
    return () => controller.abort()
  }, [])

  // Instant client-side filtering with Arabic normalization
  const filtered = useMemo(() => {
    if (!search.trim()) return allSongs
    const q = normalizeSearch(search)
    return allSongs.filter(song =>
      normalizeSearch(song.title).includes(q) ||
      normalizeSearch(song.title_ar || '').includes(q) ||
      normalizeSearch(song.artist || '').includes(q) ||
      normalizeSearch(song.artist_ar || '').includes(q) ||
      normalizeSearch(song.lyrics || '').includes(q) ||
      normalizeSearch(song.lyrics_ar || '').includes(q) ||
      (song.tags?.some(tag => normalizeSearch(tag).includes(q)))
    )
  }, [allSongs, search])

  const getSlideCount = (lyrics: string | null) => {
    if (!lyrics) return 0
    return lyrics.split(/\n\s*\n/).filter(s => s.trim()).length
  }

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  return (
    <div className="space-y-4">
      <SearchInput<Song>
        value={search}
        onChange={setSearch}
        placeholder={t('searchPlaceholder')}
        noResultsText={t('noSearchResults')}
        fetchResults={async (q) => {
          const normalized = normalizeSearch(q)
          return allSongs.filter(song =>
            normalizeSearch(song.title).includes(normalized) ||
            normalizeSearch(song.title_ar || '').includes(normalized) ||
            normalizeSearch(song.artist || '').includes(normalized) ||
            normalizeSearch(song.artist_ar || '').includes(normalized)
          ).slice(0, 8)
        }}
        getKey={(song) => song.id}
        renderResult={(song) => {
          const title = isAr ? (song.title_ar || song.title) : song.title
          const artist = isAr ? (song.artist_ar || song.artist) : song.artist
          return (
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{title}</p>
                {artist && <p className="text-xs text-muted-foreground truncate">{artist}</p>}
              </div>
            </div>
          )
        }}
        onSelect={(song) => router.push(`/admin/songs/${song.id}`)}
      />

      {loading ? (
        <ListShimmer count={6} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? t('noSearchResults') : t('noSongs')}
        </div>
      ) : (
        <div ref={parentRef} className="rounded-lg border overflow-auto max-h-[70vh]">
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const song = filtered[virtualRow.index]
              const title = isAr ? (song.title_ar || song.title) : song.title
              const artist = isAr ? (song.artist_ar || song.artist) : song.artist
              const slideCount = getSlideCount(isAr ? (song.lyrics_ar || song.lyrics) : song.lyrics)

              return (
                <Link
                  key={song.id}
                  href={`/admin/songs/${song.id}`}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors absolute w-full border-b last:border-b-0"
                  style={{ top: `${virtualRow.start}px` }}
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
        </div>
      )}
    </div>
  )
}
