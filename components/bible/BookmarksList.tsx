'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Bookmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { BibleBookmark } from '@/types'

interface BookmarksListProps {
  bookmarks: BibleBookmark[]
  onNavigate: (chapterId: string) => void
  onDelete: (id: string) => void
}

export function BookmarksList({ bookmarks, onNavigate, onDelete }: BookmarksListProps) {
  const t = useTranslations('bible')
  const locale = useLocale()
  const isAr = locale === 'ar'

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bookmark className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t('bookmarksEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {bookmarks.map((bm) => {
        const label = isAr ? (bm.reference_label_ar || bm.reference_label) : bm.reference_label
        return (
          <div key={bm.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
            <button
              onClick={() => onNavigate(bm.chapter_id)}
              className="flex-1 text-start min-w-0"
            >
              <p className="font-medium text-sm">{label}</p>
              {bm.note && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bm.note}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(bm.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
              </p>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                try {
                  await fetch(`/api/bible/bookmarks/${bm.id}`, { method: 'DELETE' })
                  onDelete(bm.id)
                  toast.success(t('bookmarkRemoved'))
                } catch {
                  toast.error(t('errorLoading'))
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
