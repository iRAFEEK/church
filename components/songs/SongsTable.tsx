'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Music, Search, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { ListShimmer } from '@/components/ui/list-shimmer'
import { splitIntoSlides, findSlideForText } from '@/lib/utils/song-slides'

const PAGE_SIZE = 50

interface SongResult {
  id: string
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
  lyrics: string | null
  lyrics_ar: string | null
  tags: string[]
  is_active: boolean
  snippet?: string
}

export function SongsTable() {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [songs, setSongs] = useState<SongResult[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchSongs = useCallback(async (q: string, p: number, signal: AbortSignal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE), locale })
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/songs?${params}`, { signal })
      if (res.ok) {
        const json = await res.json()
        if (!signal.aborted) {
          setSongs(json.data || [])
          setTotalPages(json.totalPages || 1)
          setTotalCount(json.count || 0)
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[SongsTable] Failed to fetch:', e)
      }
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    const controller = new AbortController()
    fetchSongs(debouncedSearch, page, controller.signal)
    return () => controller.abort()
  }, [debouncedSearch, page, fetchSongs])

  const isSearching = debouncedSearch.trim().length > 0

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isSearching ? 100 : 72,
    overscan: 5,
  })

  const handlePresent = (song: SongResult) => {
    const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : (song.lyrics || song.lyrics_ar)
    let slideIndex = 0
    if (song.snippet && lyrics) {
      slideIndex = Math.max(0, findSlideForText(lyrics, song.snippet))
    }
    window.open(`/presenter/songs/${song.id}?slide=${slideIndex}`, '_blank')
  }

  const getSlideInfo = (song: SongResult) => {
    if (!song.snippet) return null
    const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : (song.lyrics || song.lyrics_ar)
    if (!lyrics) return null
    const slideIndex = findSlideForText(lyrics, song.snippet)
    if (slideIndex < 0) return null
    return { index: slideIndex, total: splitIntoSlides(lyrics).length }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="ps-10 text-base"
          dir="auto"
        />
      </div>

      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} {t('songsCount')}
        </p>
      )}

      {loading ? (
        <ListShimmer count={6} />
      ) : songs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? t('noSearchResults') : t('noSongs')}
        </div>
      ) : (
        <div ref={parentRef} className="rounded-lg border overflow-auto max-h-[70vh]">
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const song = songs[virtualRow.index]
              const title = isAr ? (song.title_ar || song.title) : song.title
              const artist = isAr ? (song.artist_ar || song.artist) : song.artist
              const slideInfo = isSearching ? getSlideInfo(song) : null
              const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : (song.lyrics || song.lyrics_ar)
              const slideCount = lyrics ? splitIntoSlides(lyrics).length : 0

              return (
                <button
                  key={song.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors absolute w-full border-b last:border-b-0 text-start"
                  style={{ top: `${virtualRow.start}px` }}
                  onClick={() => handlePresent(song)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <Play className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{title}</p>
                      {!isSearching && slideCount > 0 && (
                        <Badge variant="secondary" className="shrink-0">{slideCount} {t('slides')}</Badge>
                      )}
                    </div>
                    {artist && (
                      <p className="text-sm text-muted-foreground truncate">{artist}</p>
                    )}
                    {/* Lyrics snippet when searching */}
                    {isSearching && song.snippet && (
                      <div className="mt-1 flex items-start gap-2 text-xs">
                        {slideInfo && (
                          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                            {t('matchInSlide', { number: slideInfo.index + 1 })}
                          </Badge>
                        )}
                        <p
                          className="text-muted-foreground line-clamp-2 [&>mark]:bg-primary/20 [&>mark]:text-foreground [&>mark]:rounded-sm [&>mark]:px-0.5"
                          dir="auto"
                          dangerouslySetInnerHTML={{ __html: song.snippet }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            {t('previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            {t('next')}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  )
}
