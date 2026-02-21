'use client'

import { useTranslations, useLocale } from 'next-intl'
import { BIBLE_BOOKS_AR, OT_BOOKS, DEUTEROCANONICAL_BOOKS, NT_BOOKS, getBookSection } from '@/lib/bible/constants'
import type { ApiBibleBook } from '@/types'

interface BookSelectorProps {
  books: ApiBibleBook[]
  onSelect: (bookId: string) => void
}

export function BookSelector({ books, onSelect }: BookSelectorProps) {
  const t = useTranslations('bible')
  const locale = useLocale()
  const isAr = locale === 'ar'

  // Group books by section
  const otBooks: ApiBibleBook[] = []
  const dcBooks: ApiBibleBook[] = []
  const ntBooks: ApiBibleBook[] = []

  for (const book of books) {
    const section = getBookSection(book.id)
    if (section === 'nt') ntBooks.push(book)
    else if (section === 'deuterocanonical') dcBooks.push(book)
    else otBooks.push(book)
  }

  const getBookName = (book: ApiBibleBook) => {
    if (isAr && BIBLE_BOOKS_AR[book.id]) return BIBLE_BOOKS_AR[book.id]
    return book.name
  }

  const renderSection = (title: string, sectionBooks: ApiBibleBook[]) => {
    if (sectionBooks.length === 0) return null
    return (
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {sectionBooks.map((book) => (
            <button
              key={book.id}
              onClick={() => onSelect(book.id)}
              className="text-start p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors"
            >
              <span className="text-sm font-medium">{getBookName(book)}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {renderSection(t('oldTestament'), otBooks)}
      {renderSection(t('deuterocanonical'), dcBooks)}
      {renderSection(t('newTestament'), ntBooks)}
    </div>
  )
}
