'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Music, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { ListShimmer } from '@/components/ui/list-shimmer'
import type { Song } from '@/types'

const PAGE_SIZE = 50

export function SongsTable() {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [songs, setSongs] = useState<Song[]>([])
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
      setPage(1) // Reset to first page on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchSongs = useCallback(async (q: string, p: number, signal: AbortSignal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
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
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchSongs(debouncedSearch, page, controller.signal)
    return () => controller.abort()
  }, [debouncedSearch, page, fetchSongs])

  const getSlideCount = (lyrics: string | null) => {
    if (!lyrics) return 0
    return lyrics.split(/\n\s*\n/).filter(s => s.trim()).length
  }

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

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
                  </div>
                </Link>
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
