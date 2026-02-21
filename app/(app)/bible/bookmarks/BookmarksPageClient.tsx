'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookmarksList } from '@/components/bible/BookmarksList'
import type { BibleBookmark } from '@/types'

interface BookmarksPageClientProps {
  initialBookmarks: BibleBookmark[]
}

export function BookmarksPageClient({ initialBookmarks }: BookmarksPageClientProps) {
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState(initialBookmarks)

  return (
    <BookmarksList
      bookmarks={bookmarks}
      onNavigate={(chapterId) => {
        router.push(`/bible?chapter=${chapterId}`)
      }}
      onDelete={(id) => {
        setBookmarks((prev) => prev.filter((b) => b.id !== id))
      }}
    />
  )
}
