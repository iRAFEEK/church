'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft, ChevronRight, Loader2, BookOpen,
  Bookmark, Minus, Plus, Presentation, Type,
} from 'lucide-react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChapterContent } from './ChapterContent'
import { BibleSearch } from './BibleSearchDialog'
import { BookmarksList } from './BookmarksList'
import { BIBLE_BOOKS_AR, getBookSection } from '@/lib/bible/constants'
import type {
  ApiBibleBook,
  ApiBibleChapterContent, BibleHighlight, BibleBookmark,
} from '@/types'

interface BibleVersion {
  id: string
  name: string
  name_local: string
  abbreviation: string
  abbreviation_local: string
  language_id: string
}

interface BibleReaderProps {
  books: ApiBibleBook[]
  chaptersMap: Record<string, { id: string; number: string }[]>
  initialBibleId: string
}

export function BibleReader({ books, chaptersMap, initialBibleId }: BibleReaderProps) {
  const t = useTranslations('bible')

  // Version state
  const [bibleId, setBibleId] = useState(initialBibleId)
  const [availableVersions, setAvailableVersions] = useState<BibleVersion[]>([])
  const [currentBooks, setCurrentBooks] = useState(books)
  const [currentChaptersMap, setCurrentChaptersMap] = useState(chaptersMap)

  // Core state
  const [chapterContent, setChapterContent] = useState<ApiBibleChapterContent | null>(null)
  const [highlights, setHighlights] = useState<BibleHighlight[]>([])
  const [bookmarks, setBookmarks] = useState<BibleBookmark[]>([])

  // Selection state
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [versionLoading, setVersionLoading] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('ekklesia_bible_font_size') || '18', 10)
    }
    return 18
  })

  const contentRef = useRef<HTMLDivElement>(null)

  // Chapters for the selected book — instant from pre-loaded map
  const chapters = selectedBookId ? (currentChaptersMap[selectedBookId] || []) : []

  // Persist font size
  useEffect(() => {
    localStorage.setItem('ekklesia_bible_font_size', String(fontSize))
  }, [fontSize])

  // Fetch available versions on mount
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/bible/bibles', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setAvailableVersions(d.data || []) })
      .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') console.error('[BibleReader] Failed to fetch versions:', e) })
    return () => controller.abort()
  }, [])

  // Load bookmarks on mount
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/bible/bookmarks', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setBookmarks(d.data || []) })
      .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') console.error('[BibleReader] Failed to fetch bookmarks:', e) })
    return () => controller.abort()
  }, [])

  // Load highlights when chapter changes
  useEffect(() => {
    if (!chapterContent) return
    const controller = new AbortController()
    fetch(`/api/bible/highlights?chapter_id=${chapterContent.id}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setHighlights(d.data || []) })
      .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') console.error('[BibleReader] Failed to fetch highlights:', e) })
    return () => controller.abort()
  }, [chapterContent?.id])

  // Handle version change
  const handleVersionChange = useCallback(async (newBibleId: string) => {
    if (newBibleId === bibleId) return
    setBibleId(newBibleId)
    setSelectedBookId('')
    setSelectedChapterId('')
    setChapterContent(null)
    setVersionLoading(true)

    try {
      const [booksRes, chaptersRes] = await Promise.all([
        fetch(`/api/bible/${newBibleId}/books`).then(r => r.json()),
        fetch(`/api/bible/${newBibleId}/chapters-map`).then(r => r.json()),
      ])
      setCurrentBooks(booksRes.data || [])
      setCurrentChaptersMap(chaptersRes.data || {})

      // Save preference
      fetch('/api/profile/bible-preference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_bible_id: newBibleId }),
      }).catch(() => {})
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setVersionLoading(false)
    }
  }, [bibleId])

  // Handle book change — chapters are instant from the map
  const handleBookChange = useCallback((bookId: string) => {
    setSelectedBookId(bookId)
    setSelectedChapterId('')
    setChapterContent(null)
  }, [])

  // Handle chapter change — only this needs a fetch
  const handleChapterChange = useCallback(async (chapterId: string) => {
    setSelectedChapterId(chapterId)
    setLoading(true)

    try {
      const res = await fetch(`/api/bible/${bibleId}/chapters/${chapterId}`)
      const json = await res.json()
      setChapterContent(json.data?.chapter || json.data || null)
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      setChapterContent(null)
      toast.error(t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }, [bibleId])

  // Navigate between chapters
  const navigateChapter = useCallback((direction: 'prev' | 'next') => {
    if (!selectedChapterId || chapters.length === 0) return
    const currentIdx = chapters.findIndex(ch => ch.id === selectedChapterId)
    const targetIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1
    if (targetIdx >= 0 && targetIdx < chapters.length) {
      handleChapterChange(chapters[targetIdx].id)
    }
  }, [selectedChapterId, chapters, handleChapterChange])

  // Handle search navigation — opens presenter at the exact verse
  const handleSearchNavigate = useCallback((chapterId: string, verseNum?: number) => {
    const url = verseNum
      ? `/presenter/bible/${bibleId}/${chapterId}?verse=${verseNum}`
      : `/presenter/bible/${bibleId}/${chapterId}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [bibleId])

  // Open presenter
  const openPresenter = () => {
    if (!chapterContent) return
    window.open(
      `/presenter/bible/${bibleId}/${chapterContent.id}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  // Refresh helpers
  const refreshHighlights = useCallback(async () => {
    if (!chapterContent) return
    try {
      const res = await fetch(`/api/bible/highlights?chapter_id=${chapterContent.id}`)
      const json = await res.json()
      setHighlights(json.data || [])
    } catch {
      toast.error(t('errorGeneral'))
    }
  }, [chapterContent])

  const refreshBookmarks = useCallback(async () => {
    try {
      const res = await fetch('/api/bible/bookmarks')
      const json = await res.json()
      setBookmarks(json.data || [])
    } catch {
      toast.error(t('errorGeneral'))
    }
  }, [])

  const currentChapterIdx = selectedChapterId ? chapters.findIndex(ch => ch.id === selectedChapterId) : -1
  const hasPrev = currentChapterIdx > 0
  const hasNext = currentChapterIdx >= 0 && currentChapterIdx < chapters.length - 1

  // Group books by section
  const otBooks = currentBooks.filter(b => getBookSection(b.id) === 'ot')
  const dcBooks = currentBooks.filter(b => getBookSection(b.id) === 'deuterocanonical')
  const ntBooks = currentBooks.filter(b => getBookSection(b.id) === 'nt')

  return (
    <div className="space-y-4">
      {/* Navigation Bar */}
      <div className="space-y-2">
        {/* Row 1: Book/Chapter selects */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Version dropdown */}
          {availableVersions.length > 1 && (
            <Select value={bibleId} onValueChange={handleVersionChange} disabled={versionLoading}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] h-11 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name_local || v.name} ({v.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Book dropdown */}
          <Select value={selectedBookId} onValueChange={handleBookChange} disabled={versionLoading}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-auto sm:min-w-[140px] h-11 text-sm">
              <SelectValue placeholder={t('selectBook')} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {otBooks.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {t('oldTestament')}
                  </div>
                  {otBooks.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {BIBLE_BOOKS_AR[book.id] || book.name}
                    </SelectItem>
                  ))}
                </>
              )}
              {dcBooks.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                    {t('deuterocanonical')}
                  </div>
                  {dcBooks.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {BIBLE_BOOKS_AR[book.id] || book.name}
                    </SelectItem>
                  ))}
                </>
              )}
              {ntBooks.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                    {t('newTestament')}
                  </div>
                  {ntBooks.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {BIBLE_BOOKS_AR[book.id] || book.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          {/* Chapter dropdown */}
          <Select
            value={selectedChapterId}
            onValueChange={handleChapterChange}
            disabled={chapters.length === 0 || versionLoading}
          >
            <SelectTrigger className="flex-1 sm:flex-none sm:w-auto sm:min-w-[100px] h-11 text-sm">
              <SelectValue placeholder={t('selectChapter')} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {chapters.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {t('chapter')} {ch.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <BibleSearch bibleId={bibleId} onNavigate={handleSearchNavigate} />

          {/* Font size control */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={t('fontSize')}>
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">{t('fontSize')}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setFontSize(s => Math.max(12, s - 2))}
                    aria-label={t('decreaseFontSize')}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-mono w-8 text-center">{fontSize}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setFontSize(s => Math.min(36, s + 2))}
                    aria-label={t('increaseFontSize')}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Bookmarks */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBookmarks(!showBookmarks)}
            className={`h-9 w-9 p-0 ${showBookmarks ? 'bg-muted' : ''}`}
            aria-label={t('bookmarks')}
          >
            <Bookmark className="h-4 w-4" />
          </Button>

          {/* Present button */}
          {chapterContent && (
            <Button variant="ghost" size="sm" onClick={openPresenter} className="h-9 w-9 p-0" aria-label={t('present')}>
              <Presentation className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {(loading || versionLoading) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Bookmarks panel */}
      {showBookmarks && !loading && !versionLoading && (
        <div className="rounded-lg border">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">{t('bookmarks')}</h3>
          </div>
          <BookmarksList
            bookmarks={bookmarks}
            onNavigate={(chapterId) => {
              handleSearchNavigate(chapterId)
              setShowBookmarks(false)
            }}
            onDelete={(id) => setBookmarks(prev => prev.filter(b => b.id !== id))}
          />
        </div>
      )}

      {/* Chapter Content */}
      {!loading && !versionLoading && !showBookmarks && chapterContent && (
        <div ref={contentRef} className="rounded-lg border">
          <ChapterContent
            bibleId={bibleId}
            bookId={chapterContent.bookId}
            chapterId={chapterContent.id}
            chapterNumber={chapterContent.number}
            reference={chapterContent.reference}
            content={chapterContent.content}
            copyright={chapterContent.copyright}
            highlights={highlights}
            bookmarks={bookmarks}
            isRtl={true}
            fontSize={fontSize}
            onHighlightsChange={refreshHighlights}
            onBookmarksChange={refreshBookmarks}
          />

          {/* Chapter navigation */}
          <div className="flex items-center justify-between p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasPrev}
              onClick={() => navigateChapter('prev')}
              aria-label={t('back')}
            >
              <ChevronLeft className="h-4 w-4 me-1" />
              {t('back')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {chapterContent.reference}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasNext}
              onClick={() => navigateChapter('next')}
            >
              {t('chapter')} →
              <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !versionLoading && !showBookmarks && !chapterContent && (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">
            {!selectedBookId ? t('selectBook') : t('selectChapter')}
          </p>
        </div>
      )}
    </div>
  )
}
