'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Search, X, Music } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { findSlideForText } from '@/lib/utils/song-slides'

interface SearchResult {
  id: string
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
  lyrics: string | null
  lyrics_ar: string | null
  snippet?: string
  display_settings?: Record<string, unknown>
}

interface PresenterSearchProps {
  onSelect: (song: SearchResult, slideIndex: number) => void
  onClose: () => void
}

export function PresenterSearch({ onSelect, onClose }: PresenterSearchProps) {
  const t = useTranslations('songs')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fetch results with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      // Cancel previous request
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setLoading(true)
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          pageSize: '10',
          locale,
        })
        const res = await fetch(`/api/songs?${params}`, { signal: controller.signal })
        if (res.ok && !controller.signal.aborted) {
          const json = await res.json()
          setResults(json.data || [])
          setHighlightedIndex(0)
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[PresenterSearch] fetch error:', e)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, locale])

  const handleSelect = useCallback((song: SearchResult) => {
    const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : (song.lyrics || song.lyrics_ar)
    let slideIndex = 0
    if (song.snippet && lyrics) {
      slideIndex = Math.max(0, findSlideForText(lyrics, song.snippet))
    }
    onSelect(song, slideIndex)
  }, [isAr, onSelect])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(i => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[highlightedIndex]) {
            handleSelect(results[highlightedIndex])
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, highlightedIndex, handleSelect, onClose])

  const getSlideIndex = (song: SearchResult) => {
    if (!song.snippet) return -1
    const lyrics = isAr ? (song.lyrics_ar || song.lyrics) : (song.lyrics || song.lyrics_ar)
    if (!lyrics) return -1
    return findSlideForText(lyrics, song.snippet)
  }

  return (
    <div
      className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-700">
        <Search className="h-5 w-5 text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchInPresenter')}
          className="flex-1 bg-transparent text-white text-lg placeholder:text-zinc-500 outline-none"
          dir="auto"
        />
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-2 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && query.trim() && (
          <div className="text-center py-8 text-zinc-500">{t('loading')}</div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="text-center py-8 text-zinc-500">{t('noResultsInPresenter')}</div>
        )}

        {!query.trim() && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            {t('shortcutSearch')}
          </div>
        )}

        {results.map((song, index) => {
          const title = isAr ? (song.title_ar || song.title) : song.title
          const artist = isAr ? (song.artist_ar || song.artist) : song.artist
          const slideIndex = getSlideIndex(song)
          const isHighlighted = index === highlightedIndex

          return (
            <button
              key={song.id}
              className={`w-full text-start p-3 rounded-lg transition-colors ${
                isHighlighted
                  ? 'bg-white/10 ring-1 ring-white/20'
                  : 'hover:bg-white/5'
              }`}
              onClick={() => handleSelect(song)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 shrink-0 mt-0.5">
                  <Music className="h-4 w-4 text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{title}</p>
                    {artist && (
                      <span className="text-zinc-500 text-sm truncate">— {artist}</span>
                    )}
                  </div>
                  {song.snippet && (
                    <div className="mt-1 flex items-start gap-2 text-xs">
                      {slideIndex >= 0 && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] px-1.5 py-0 border-zinc-600 text-zinc-400"
                        >
                          {t('matchInSlide', { number: slideIndex + 1 })}
                        </Badge>
                      )}
                      <p
                        className="text-zinc-400 line-clamp-2 [&>mark]:bg-yellow-500/30 [&>mark]:text-yellow-200 [&>mark]:rounded-sm [&>mark]:px-0.5"
                        dir="auto"
                        dangerouslySetInnerHTML={{ __html: song.snippet }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
