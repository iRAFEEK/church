'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft, ChevronRight, Settings, X, Maximize, Minimize,
  ArrowLeft, Minus, Plus, Navigation, Search, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BIBLE_BOOKS_AR, getBookSection } from '@/lib/bible/constants'
import type { ApiBibleBook } from '@/types'

const BIBLE_ID = 'ar-svd'

interface Verse {
  id: string
  verse_number: number
  text: string
}

interface SearchResult {
  id: string
  reference: string
  content: string
  chapterId: string
  verseNum: number
}

interface BiblePresenterProps {
  bookId: string
  chapterId: string
  reference: string
  verses: Verse[]
  books: ApiBibleBook[]
  initialVerseNum?: number
}

const FONT_MAP: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  arabic: '"Noto Naskh Arabic", "Traditional Arabic", serif',
}

export function BiblePresenter({
  bookId: initialBookId,
  chapterId: initialChapterId,
  reference: initialReference,
  verses: initialVerses,
  books,
  initialVerseNum,
}: BiblePresenterProps) {
  const t = useTranslations('bible')

  // Current display state
  const [verses, setVerses] = useState(initialVerses)
  const [reference, setReference] = useState(initialReference)
  const [currentVerse, setCurrentVerse] = useState(() => {
    if (initialVerseNum) {
      const idx = initialVerses.findIndex(v => v.verse_number === initialVerseNum)
      return idx >= 0 ? idx : 0
    }
    return 0
  })

  // UI state
  const [showSettings, setShowSettings] = useState(false)
  const [showGoTo, setShowGoTo] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [settings, setSettings] = useState({
    bg_color: '#000000',
    text_color: '#ffffff',
    font_family: 'arabic',
    font_size: 48,
  })

  // GoTo state
  const [goToBookId, setGoToBookId] = useState(initialBookId)
  const [goToChapters, setGoToChapters] = useState<{ id: string; number: string }[]>([])
  const [goToChapterId, setGoToChapterId] = useState(initialChapterId)
  const [goToLoading, setGoToLoading] = useState(false)
  const [bookFilter, setBookFilter] = useState('')
  const bookFilterRef = useRef<HTMLInputElement>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Filtered books
  const filteredBooks = useMemo(() => {
    if (!bookFilter.trim()) return books
    const q = bookFilter.toLowerCase()
    return books.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (BIBLE_BOOKS_AR[b.id] || '').includes(bookFilter) ||
      b.abbreviation.toLowerCase().includes(q)
    )
  }, [books, bookFilter])

  // Navigation
  const goNext = useCallback(() => {
    setCurrentVerse(prev => Math.min(prev + 1, verses.length - 1))
  }, [verses.length])

  const goPrev = useCallback(() => {
    setCurrentVerse(prev => Math.max(prev - 1, 0))
  }, [])

  // Search debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bible/${BIBLE_ID}/search?query=${encodeURIComponent(searchQuery.trim())}&limit=10`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        const data = json.data || {}
        setSearchResults(
          (data.verses || []).map((v: any) => {
            const bookId = v.bookId || v.chapterId?.split('.')[0] || ''
            const chId = v.chapterId || ''
            const vNum = v.reference?.split(':').pop() || ''
            const bookName = BIBLE_BOOKS_AR[bookId] || bookId
            return {
              id: v.id,
              reference: `${bookName} ${chId.split('.')[1] || ''}:${vNum}`,
              content: v.content?.replace(/<[^>]*>/g, '') || '',
              chapterId: chId,
              verseNum: parseInt(vNum, 10) || 0,
            }
          })
        )
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 150)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery])

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [showSearch])

  // Navigate to search result
  const handleSearchNavigate = useCallback(async (chapterId: string, verseNum: number) => {
    setShowSearch(false)
    setGoToLoading(true)
    try {
      const res = await fetch(`/api/bible/${BIBLE_ID}/chapters/${chapterId}/verses`)
      if (!res.ok) return
      const json = await res.json()
      const data = json.data || {}
      const newVerses: Verse[] = (data.verses || []).map((v: any) => ({
        id: v.id,
        verse_number: v.verse_number,
        text: v.text,
      }))

      if (newVerses.length > 0) {
        setVerses(newVerses)
        setReference(data.reference || chapterId)
        const targetIdx = newVerses.findIndex(v => v.verse_number === verseNum)
        setCurrentVerse(targetIdx >= 0 ? targetIdx : 0)
        setGoToChapterId(chapterId)
      }
    } catch {
      // silently fail
    } finally {
      setGoToLoading(false)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      switch (e.key) {
        case 'ArrowRight':
          if (!showGoTo && !showSearch) goPrev()
          break
        case 'ArrowLeft':
          if (!showGoTo && !showSearch) goNext()
          break
        case 'ArrowDown':
        case ' ':
          if (!showGoTo && !showSearch) { e.preventDefault(); goNext() }
          break
        case 'ArrowUp':
          if (!showGoTo && !showSearch) { e.preventDefault(); goPrev() }
          break
        case 'f':
        case 'F':
          if (!showGoTo && !showSettings && !showSearch) toggleFullscreen()
          break
        case 'g':
        case 'G':
          if (!showSettings && !showSearch) {
            e.preventDefault()
            setShowGoTo(prev => !prev)
          }
          break
        case 's':
        case 'S':
          if (!showSettings && !showGoTo) {
            e.preventDefault()
            setShowSearch(prev => !prev)
          }
          break
        case 'Escape':
          if (showSearch) setShowSearch(false)
          else if (showGoTo) setShowGoTo(false)
          else if (showSettings) setShowSettings(false)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, showSettings, showGoTo, showSearch])

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFSChange)
    return () => document.removeEventListener('fullscreenchange', handleFSChange)
  }, [])

  // Focus book filter when GoTo opens
  useEffect(() => {
    if (showGoTo) {
      setTimeout(() => bookFilterRef.current?.focus(), 100)
    } else {
      setBookFilter('')
    }
  }, [showGoTo])

  // Load chapters when GoTo book changes
  useEffect(() => {
    if (!showGoTo || !goToBookId) return
    setGoToChapters([])
    setGoToChapterId('')

    fetch(`/api/bible/${BIBLE_ID}/books/${goToBookId}/chapters`)
      .then(r => r.json())
      .then(json => {
        const chs = (json.data || []).map((c: any) => ({ id: c.id, number: c.number }))
        setGoToChapters(chs)
      })
      .catch(() => {})
  }, [goToBookId, showGoTo])

  // Navigate to selected chapter/verse
  const handleGoTo = useCallback(async (chapterId: string, verseNum?: number) => {
    setGoToLoading(true)
    try {
      const res = await fetch(`/api/bible/${BIBLE_ID}/chapters/${chapterId}/verses`)
      if (!res.ok) return
      const json = await res.json()
      const data = json.data || {}
      const newVerses: Verse[] = (data.verses || []).map((v: any) => ({
        id: v.id,
        verse_number: v.verse_number,
        text: v.text,
      }))

      if (newVerses.length > 0) {
        setVerses(newVerses)
        setReference(data.reference || chapterId)

        const targetIdx = verseNum
          ? newVerses.findIndex(v => v.verse_number === verseNum)
          : 0
        setCurrentVerse(targetIdx >= 0 ? targetIdx : 0)
        setGoToChapterId(chapterId)
        setShowGoTo(false)
      }
    } catch {
      // silently fail
    } finally {
      setGoToLoading(false)
    }
  }, [])

  if (verses.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-xl">{t('errorLoading')}</p>
      </div>
    )
  }

  const verse = verses[currentVerse]

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden select-none"
      style={{ backgroundColor: settings.bg_color }}
    >
      {/* Slide content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-8 cursor-pointer"
        onClick={(e) => {
          if (showGoTo || showSettings) return
          const rect = (e.target as HTMLElement).getBoundingClientRect()
          const clickX = e.clientX - rect.left
          // RTL: click right = prev, click left = next
          if (clickX < rect.width / 2) {
            goNext()
          } else {
            goPrev()
          }
        }}
      >
        {/* Verse reference */}
        <p
          className="mb-4 opacity-50 z-10"
          style={{
            color: settings.text_color,
            fontFamily: FONT_MAP[settings.font_family] || FONT_MAP.arabic,
            fontSize: `${Math.max(settings.font_size * 0.4, 16)}px`,
          }}
          dir="rtl"
        >
          {reference}:{verse.verse_number}
        </p>

        {/* Verse text */}
        <p
          className="text-center leading-relaxed max-w-4xl z-10"
          style={{
            color: settings.text_color,
            fontFamily: FONT_MAP[settings.font_family] || FONT_MAP.arabic,
            fontSize: `${settings.font_size}px`,
          }}
          dir="rtl"
        >
          {verse.text}
        </p>
      </div>

      {/* Bottom controls bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between p-4 z-20 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => window.close()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm">
            {currentVerse + 1} / {verses.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={goPrev}
            disabled={currentVerse === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={goNext}
            disabled={currentVerse === verses.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowGoTo(!showGoTo)}
          >
            <Navigation className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* ========== Search Overlay ========== */}
      {showSearch && (
        <div
          className="absolute inset-0 z-40 flex items-start justify-center pt-[15vh] bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl w-[90vw] max-w-lg overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="p-4 border-b border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">{t('search')}</h3>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-700 text-zinc-400 rounded">S</kbd>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:bg-zinc-700"
                    onClick={() => setShowSearch(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800 text-white text-sm rounded-md ps-10 pe-10 py-2 border border-zinc-600 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                  dir="rtl"
                />
                {searchLoading && (
                  <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[40vh] overflow-y-auto">
              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  {t('searchNoResults')}
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="py-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchNavigate(result.chapterId, result.verseNum)}
                      className="w-full text-start px-4 py-2.5 hover:bg-zinc-700/50 transition-colors"
                      dir="rtl"
                    >
                      <p className="text-xs font-semibold text-blue-400">{result.reference}</p>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{result.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== GoTo Navigation Overlay ========== */}
      {showGoTo && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowGoTo(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl w-[90vw] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="text-white font-semibold text-sm">{t('goTo')}</h3>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-700 text-zinc-400 rounded">G</kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:bg-zinc-700"
                  onClick={() => setShowGoTo(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Three-column navigation */}
            <div className="flex flex-1 min-h-0">
              {/* Book column */}
              <div className="flex-1 border-e border-zinc-700 flex flex-col min-w-0">
                <div className="p-2 border-b border-zinc-800">
                  <input
                    ref={bookFilterRef}
                    type="text"
                    placeholder={t('searchBook')}
                    value={bookFilter}
                    onChange={(e) => setBookFilter(e.target.value)}
                    className="w-full bg-zinc-800 text-white text-sm rounded-md px-3 py-1.5 border border-zinc-600 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                    dir="rtl"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredBooks.map((book) => {
                    const section = getBookSection(book.id)
                    return (
                      <button
                        key={book.id}
                        onClick={() => setGoToBookId(book.id)}
                        className={`w-full text-end px-3 py-1.5 text-sm transition-colors flex items-center gap-2 ${
                          goToBookId === book.id
                            ? 'bg-blue-600/30 text-blue-300'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                        dir="rtl"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          section === 'ot' ? 'bg-amber-500' :
                          section === 'nt' ? 'bg-emerald-500' : 'bg-purple-500'
                        }`} />
                        <span className="truncate">{BIBLE_BOOKS_AR[book.id] || book.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chapter column */}
              <div className="flex-1 border-e border-zinc-700 flex flex-col min-w-0">
                <div className="p-2 border-b border-zinc-800">
                  <p className="text-xs text-zinc-500 px-1">{t('chapter')}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {goToChapters.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center mt-4">{t('selectBook')}</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1">
                      {goToChapters.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            setGoToChapterId(ch.id)
                            handleGoTo(ch.id)
                          }}
                          className={`aspect-square flex items-center justify-center rounded text-sm transition-colors ${
                            goToChapterId === ch.id
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          {ch.number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Verse column */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-2 border-b border-zinc-800">
                  <p className="text-xs text-zinc-500 px-1">{t('verse')}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {verses.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center mt-4">{t('selectChapter')}</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1">
                      {verses.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setCurrentVerse(verses.findIndex(vv => vv.id === v.id))
                            setShowGoTo(false)
                          }}
                          className={`aspect-square flex items-center justify-center rounded text-sm transition-colors ${
                            verse.id === v.id
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          {v.verse_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Loading indicator */}
            {goToLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== Settings Panel ========== */}
      {showSettings && (
        <div
          className="absolute top-0 end-0 h-full w-80 bg-zinc-900/95 backdrop-blur-sm border-s border-zinc-700 z-30 overflow-y-auto p-6 space-y-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{t('presenterSettings')}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowSettings(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('bgColor')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.bg_color}
                onChange={(e) => setSettings(s => ({ ...s, bg_color: e.target.value }))}
                className="h-10 w-14 rounded border border-zinc-600 cursor-pointer bg-transparent"
              />
              <span className="text-zinc-400 text-sm font-mono">{settings.bg_color}</span>
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('textColor')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.text_color}
                onChange={(e) => setSettings(s => ({ ...s, text_color: e.target.value }))}
                className="h-10 w-14 rounded border border-zinc-600 cursor-pointer bg-transparent"
              />
              <span className="text-zinc-400 text-sm font-mono">{settings.text_color}</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-zinc-300">{t('fontFamily')}</Label>
            <select
              value={settings.font_family}
              onChange={(e) => setSettings(s => ({ ...s, font_family: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white"
            >
              <option value="arabic">Arabic (Naskh)</option>
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              {t('fontSize')}: {settings.font_size}px
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-zinc-300 border-zinc-600"
                onClick={() => setSettings(s => ({ ...s, font_size: Math.max(24, s.font_size - 4) }))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="range"
                min={24}
                max={120}
                step={4}
                value={settings.font_size}
                onChange={(e) => setSettings(s => ({ ...s, font_size: Number(e.target.value) }))}
                className="flex-1 accent-white"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-zinc-300 border-zinc-600"
                onClick={() => setSettings(s => ({ ...s, font_size: Math.min(120, s.font_size + 4) }))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>24px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="space-y-1 pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 font-semibold uppercase">{t('shortcuts')}</p>
            <div className="text-xs text-zinc-500 space-y-1">
              <p>← → {t('shortcutNav')}</p>
              <p>Space {t('shortcutNext')}</p>
              <p>S {t('search')}</p>
              <p>G {t('shortcutGoTo')}</p>
              <p>F {t('shortcutFullscreen')}</p>
              <p>Esc {t('shortcutClose')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
