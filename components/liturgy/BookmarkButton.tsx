'use client'

import { useTranslations } from 'next-intl'
import { Bookmark } from 'lucide-react'

import { Button } from '@/components/ui/button'

type BookmarkButtonProps = {
  contentId?: string
  hymnId?: string
  isBookmarked: boolean
  onToggle: () => void
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
}: BookmarkButtonProps) {
  const t = useTranslations('Liturgy')

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0"
      onClick={onToggle}
      aria-label={isBookmarked ? t('bookmarked') : t('bookmark')}
    >
      <Bookmark
        className={`size-5 ${
          isBookmarked
            ? 'fill-primary text-primary'
            : 'text-muted-foreground'
        }`}
      />
    </Button>
  )
}
