'use client'

import { useTranslations } from 'next-intl'
import { HIGHLIGHT_COLORS } from '@/lib/bible/constants'
import type { HighlightColor } from '@/types'

interface HighlightPaletteProps {
  activeColor?: HighlightColor | null
  onSelect: (color: HighlightColor) => void
  onRemove: () => void
}

export function HighlightPalette({ activeColor, onSelect, onRemove }: HighlightPaletteProps) {
  const t = useTranslations('bible')

  return (
    <div className="flex items-center gap-1.5">
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          className={`h-6 w-6 rounded-full ${c.class} border-2 transition-transform hover:scale-110 ${
            activeColor === c.value ? 'border-zinc-900 scale-110' : 'border-transparent'
          }`}
          title={t(`color${c.value.charAt(0).toUpperCase() + c.value.slice(1)}` as any)}
        />
      ))}
      {activeColor && (
        <button
          type="button"
          onClick={onRemove}
          className="h-6 w-6 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-xs hover:border-zinc-500 hover:text-zinc-600 transition-colors"
          title={t('highlightRemoved')}
        >
          ✕
        </button>
      )}
    </div>
  )
}
