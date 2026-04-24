'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Music, Search, Loader2, Presentation } from 'lucide-react'
import { ListShimmer } from '@/components/ui/list-shimmer'
import { toast } from 'sonner'

interface SongListItem {
  id: string
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
  tags: string[]
  is_active: boolean
}

const PAGE_SIZE = 50

// Simple LRU cache for search results — avoids re-fetching on backspace/re-type
const queryCache = new Map<string, { data: SongListItem[]; hasMore: boolean; ts: number }>()
const CACHE_TTL = 30_000 // 30s
const CACHE_MAX = 50

function getCached(key: string) {
  const entry = queryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { queryCache.delete(key); return null }
  return entry
}

function setCache(key: string, data: SongListItem[], hasMore: boolean) {
  if (queryCache.size >= CACHE_MAX) {
    // Evict oldest
    const first = queryCache.keys().next().value
    if (first !== undefined) queryCache.delete(first)
  }
  queryCache.set(key, { data, hasMore, ts: Date.now() })
}

export function SongsTable() {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const router = useRouter()

  const [songs, setSongs] = useState<SongListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSongs = useCallback(async (q: string, pageNum: number, append: boolean) => {
    const cacheKey = `${q.trim()}|${pageNum}`

    // Check cache first
    const cached = getCached(cacheKey)
    if (cached) {
      setSongs(prev => append ? [...prev, ...cached.data] : cached.data)
      setHasMore(cached.hasMore)
      setError(false)
      setLoading(false)
      setSearching(false)
      setLoadingMore(false)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!append) setSearching(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      })
      if (q.trim()) params.set('q', q.trim())

      const res = await fetch(`/api/songs?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to load songs')
      const json = await res.json()

      const newSongs: SongListItem[] = json.data || []
      const more: boolean = json.hasMore ?? false

      // Cache the result
      setCache(cacheKey, newSongs, more)

      setSongs(prev => append ? [...prev, ...newSongs] : newSongs)
      setHasMore(more)
      setError(false)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(true)
      if (!append) setSongs([])
      toast.error(t('errorGeneral'))
    } finally {
      setLoading(false)
      setSearching(false)
      setLoadingMore(false)
    }
  }, [t])

  // Initial load
  useEffect(() => {
    fetchSongs('', 1, false)
  }, [fetchSongs])

  // Debounced search — 150ms
  const handleSearchChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Skip server call for empty query typed then cleared — use cache
    const cacheKey = `${value.trim()}|1`
    const cached = getCached(cacheKey)
    if (cached) {
      setSongs(cached.data)
      setHasMore(cached.hasMore)
      setPage(1)
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setSongs([])
      setHasMore(true)
      fetchSongs(value, 1, false)
    }, 150)
  }, [fetchSongs])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !searching && !loadingMore) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchSongs(query, nextPage, true)
        }
      },
      { root: scrollRef.current, rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, searching, loadingMore, page, query, fetchSongs])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="ps-10 h-10"
          autoComplete="off"
        />
        {searching && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {loading && !searching ? (
        <ListShimmer count={8} />
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('errorGeneral')}
        </div>
      ) : songs.length === 0 && !searching ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {query.trim() ? t('noSearchResults') : t('noSongs')}
        </div>
      ) : (
        <div ref={scrollRef} className="rounded-lg border overflow-auto max-h-[70vh]">
          {songs.map((song) => {
            const title = isAr ? (song.title_ar || song.title) : song.title
            const artist = isAr ? (song.artist_ar || song.artist) : song.artist

            return (
              <div
                key={song.id}
                onClick={() => router.push(`/admin/songs/${song.id}`)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Music className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  {artist && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{artist}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {song.tags?.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="hidden sm:inline-flex text-xs">{tag}</Badge>
                  ))}
                  <a
                    href={`/presenter/songs/${song.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-primary/10 transition-colors"
                    title={t('present')}
                  >
                    <Presentation className="h-4 w-4 text-primary" />
                  </a>
                </div>
              </div>
            )
          })}

          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
