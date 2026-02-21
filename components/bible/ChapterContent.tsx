'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { HIGHLIGHT_COLORS, BIBLE_BOOKS_AR } from '@/lib/bible/constants'
import { HighlightPalette } from './HighlightPalette'
import { Bookmark, Copy, Share2, X } from 'lucide-react'
import type { BibleHighlight, BibleBookmark, HighlightColor } from '@/types'

interface ChapterContentProps {
  bibleId: string
  bookId: string
  chapterId: string
  chapterNumber: string
  reference: string
  content: string
  copyright: string
  highlights: BibleHighlight[]
  bookmarks: BibleBookmark[]
  isRtl: boolean
  fontSize?: number
  onHighlightsChange: () => void
  onBookmarksChange: () => void
}

export function ChapterContent({
  bibleId,
  bookId,
  chapterId,
  chapterNumber,
  reference,
  content,
  copyright,
  highlights,
  bookmarks,
  isRtl,
  fontSize,
  onHighlightsChange,
  onBookmarksChange,
}: ChapterContentProps) {
  const t = useTranslations('bible')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const contentRef = useRef<HTMLDivElement>(null)
  const [selectedVerse, setSelectedVerse] = useState<{
    verseId: string
    verseText: string
    element: HTMLElement
  } | null>(null)

  // Build lookup maps
  const highlightMap = new Map(highlights.map(h => [h.verse_id, h]))
  const bookmarkSet = new Set(bookmarks.filter(b => b.chapter_id === chapterId).map(b => b.verse_id))

  // Apply highlights to verses
  useEffect(() => {
    if (!contentRef.current) return
    const container = contentRef.current

    // Find all verse spans
    const verseSpans = container.querySelectorAll('[data-verse-id]')
    verseSpans.forEach((span) => {
      const el = span as HTMLElement
      const verseId = el.getAttribute('data-verse-id')
      if (!verseId) return

      // Reset classes
      el.classList.remove(...HIGHLIGHT_COLORS.map(c => c.class))
      el.classList.remove('cursor-pointer', 'hover:bg-muted/30', 'rounded', 'px-0.5', '-mx-0.5')

      // Apply highlight if exists
      const highlight = highlightMap.get(verseId)
      if (highlight) {
        const colorDef = HIGHLIGHT_COLORS.find(c => c.value === highlight.color)
        if (colorDef) {
          el.classList.add(colorDef.class, 'rounded', 'px-0.5', '-mx-0.5')
        }
      }

      // Make clickable
      el.classList.add('cursor-pointer', 'hover:bg-muted/30', 'rounded', 'px-0.5', '-mx-0.5')
      el.style.transition = 'background-color 150ms'
    })
  }, [content, highlights, highlightMap])

  // Handle verse click
  useEffect(() => {
    if (!contentRef.current) return
    const container = contentRef.current

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-verse-id]') as HTMLElement | null
      if (!target) {
        setSelectedVerse(null)
        return
      }

      const verseId = target.getAttribute('data-verse-id')
      if (!verseId) return

      setSelectedVerse({
        verseId,
        verseText: target.textContent || '',
        element: target,
      })
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [content])

  const handleHighlight = useCallback(async (color: HighlightColor) => {
    if (!selectedVerse) return
    const bookName = isAr && BIBLE_BOOKS_AR[bookId] ? BIBLE_BOOKS_AR[bookId] : bookId
    const verseNum = selectedVerse.verseId.split('.').pop()

    try {
      await fetch('/api/bible/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bible_id: bibleId,
          book_id: bookId,
          chapter_id: chapterId,
          verse_id: selectedVerse.verseId,
          reference_label: `${reference}:${verseNum}`,
          reference_label_ar: `${bookName} ${chapterNumber}:${verseNum}`,
          color,
        }),
      })
      toast.success(t('highlightAdded'))
      onHighlightsChange()
    } catch {
      toast.error(t('errorLoading'))
    }
  }, [selectedVerse, bibleId, bookId, chapterId, reference, chapterNumber, isAr, t, onHighlightsChange])

  const handleRemoveHighlight = useCallback(async () => {
    if (!selectedVerse) return
    const highlight = highlightMap.get(selectedVerse.verseId)
    if (!highlight) return

    try {
      await fetch(`/api/bible/highlights/${highlight.id}`, { method: 'DELETE' })
      toast.success(t('highlightRemoved'))
      onHighlightsChange()
      setSelectedVerse(null)
    } catch {
      toast.error(t('errorLoading'))
    }
  }, [selectedVerse, highlightMap, t, onHighlightsChange])

  const handleBookmark = useCallback(async () => {
    if (!selectedVerse) return
    const verseNum = selectedVerse.verseId.split('.').pop()
    const bookName = isAr && BIBLE_BOOKS_AR[bookId] ? BIBLE_BOOKS_AR[bookId] : bookId
    const isAlreadyBookmarked = bookmarkSet.has(selectedVerse.verseId)

    if (isAlreadyBookmarked) {
      // Find and delete existing bookmark
      const existingBookmark = bookmarks.find(
        b => b.verse_id === selectedVerse.verseId && b.chapter_id === chapterId
      )
      if (existingBookmark) {
        try {
          await fetch(`/api/bible/bookmarks/${existingBookmark.id}`, { method: 'DELETE' })
          toast.success(t('bookmarkRemoved'))
          onBookmarksChange()
        } catch {
          toast.error(t('errorLoading'))
        }
      }
    } else {
      try {
        await fetch('/api/bible/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bible_id: bibleId,
            book_id: bookId,
            chapter_id: chapterId,
            verse_id: selectedVerse.verseId,
            reference_label: `${reference}:${verseNum}`,
            reference_label_ar: `${bookName} ${chapterNumber}:${verseNum}`,
          }),
        })
        toast.success(t('bookmarkAdded'))
        onBookmarksChange()
      } catch {
        toast.error(t('errorLoading'))
      }
    }
  }, [selectedVerse, bookmarkSet, bookmarks, bibleId, bookId, chapterId, reference, chapterNumber, isAr, t, onBookmarksChange])

  const handleCopy = useCallback(async () => {
    if (!selectedVerse) return
    const verseNum = selectedVerse.verseId.split('.').pop()
    const text = `${selectedVerse.verseText}\n— ${reference}:${verseNum}`
    await navigator.clipboard.writeText(text)
    toast.success(t('verseCopied'))
  }, [selectedVerse, reference, t])

  const handleShare = useCallback(async () => {
    if (!selectedVerse) return
    const verseNum = selectedVerse.verseId.split('.').pop()
    const text = `${selectedVerse.verseText}\n— ${reference}:${verseNum}`
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success(t('verseCopied'))
    }
  }, [selectedVerse, reference, t])

  const currentHighlight = selectedVerse ? highlightMap.get(selectedVerse.verseId) : null
  const isCurrentBookmarked = selectedVerse ? bookmarkSet.has(selectedVerse.verseId) : false

  return (
    <div className="relative">
      {/* Verse action bar */}
      {selectedVerse && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-2 duration-200">
          <HighlightPalette
            activeColor={currentHighlight?.color || null}
            onSelect={handleHighlight}
            onRemove={handleRemoveHighlight}
          />

          <div className="h-5 w-px bg-border" />

          <button
            type="button"
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isCurrentBookmarked ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isCurrentBookmarked ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedVerse(null)}
            className="ms-auto p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Chapter content */}
      <div
        ref={contentRef}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="prose prose-sm max-w-none px-2 py-4 leading-relaxed bible-content"
        style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Copyright */}
      {copyright && (
        <p className="text-[10px] text-muted-foreground/50 px-2 pt-4 border-t mt-8">
          {copyright}
        </p>
      )}
    </div>
  )
}
