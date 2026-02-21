'use client'

import { useTranslations } from 'next-intl'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Bookmark, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { HighlightPalette } from './HighlightPalette'
import type { HighlightColor } from '@/types'

interface VerseActionsProps {
  verseId: string
  verseText: string
  reference: string
  isBookmarked: boolean
  highlightColor: HighlightColor | null
  onBookmark: () => void
  onHighlight: (color: HighlightColor) => void
  onRemoveHighlight: () => void
  children: React.ReactNode
}

export function VerseActions({
  verseId,
  verseText,
  reference,
  isBookmarked,
  highlightColor,
  onBookmark,
  onHighlight,
  onRemoveHighlight,
  children,
}: VerseActionsProps) {
  const t = useTranslations('bible')

  const handleCopy = async () => {
    const text = `${verseText}\n— ${reference}`
    await navigator.clipboard.writeText(text)
    toast.success(t('verseCopied'))
  }

  const handleShare = async () => {
    const text = `${verseText}\n— ${reference}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // User cancelled or share failed, copy instead
        await navigator.clipboard.writeText(text)
        toast.success(t('verseCopied'))
      }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success(t('verseCopied'))
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3" align="start">
        {/* Highlight colors */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('highlightColor')}</p>
          <HighlightPalette
            activeColor={highlightColor}
            onSelect={onHighlight}
            onRemove={onRemoveHighlight}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 border-t pt-2">
          <button
            type="button"
            onClick={onBookmark}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isBookmarked
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            {t('bookmarks')}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {t('copyVerse')}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('shareVerse')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
