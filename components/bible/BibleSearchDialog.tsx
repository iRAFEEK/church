'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { BIBLE_BOOKS_AR } from '@/lib/bible/constants'

const BIBLE_ID = 'ar-svd'

interface SearchResult {
  id: string
  reference: string
  content: string
  bookId: string
  chapterId: string
  verseNum: number
}

interface BibleSearchProps {
  onNavigate: (chapterId: string, verseNum?: number) => void
  variant?: 'default' | 'presenter'
}

export function BibleSearch({ onNavigate, variant = 'default' }: BibleSearchProps) {
  const t = useTranslations('bible')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/bible/${BIBLE_ID}/search?query=${encodeURIComponent(q.trim())}&limit=10`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const data = json.data || {}
      setResults(
        (data.verses || []).map((v: any) => {
          const bookId = v.bookId || v.chapterId?.split('.')[0] || ''
          const chId = v.chapterId || ''
          const verseNum = v.reference?.split(':').pop() || ''
          const bookName = BIBLE_BOOKS_AR[bookId] || bookId
          const verseNumber = parseInt(verseNum, 10) || 0
          return {
            id: v.id,
            reference: `${bookName} ${chId.split('.')[1] || ''}:${verseNum}`,
            content: v.content?.replace(/<[^>]*>/g, '') || '',
            bookId,
            chapterId: chId,
            verseNum: verseNumber,
          }
        })
      )
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search — 150ms for speed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => doSearch(query), 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-10 h-9"
            />
            {loading && (
              <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('searchNoResults')}
            </div>
          )}

          {results.length > 0 && (
            <div className="py-1">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onNavigate(result.chapterId, result.verseNum)
                    setOpen(false)
                  }}
                  className={`w-full text-start px-3 py-2 transition-colors ${
                    variant === 'presenter'
                      ? 'hover:bg-zinc-700/50 text-zinc-200'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className={`text-xs font-semibold ${variant === 'presenter' ? 'text-blue-400' : 'text-primary'}`}>{result.reference}</p>
                  <p className={`text-xs line-clamp-1 mt-0.5 ${variant === 'presenter' ? 'text-zinc-400' : 'text-muted-foreground'}`}>{result.content}</p>
                </button>
              ))}
            </div>
          )}

          {query.trim().length < 2 && query.trim().length > 0 && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              {t('searchPlaceholder')}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
