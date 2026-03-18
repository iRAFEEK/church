'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type LocationFilterPillsProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  selectedLocationId: string | null // null = "All"
  onSelect: (locationId: string | null) => void
  isAr: boolean
}

export function LocationFilterPills({
  locations,
  selectedLocationId,
  onSelect,
  isAr,
}: LocationFilterPillsProps) {
  const t = useTranslations('bookings')

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-1">
      {/* All pill */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors',
          selectedLocationId === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:bg-zinc-300'
        )}
      >
        {t('allLocations')}
      </button>

      {locations.map((loc) => (
        <button
          key={loc.id}
          type="button"
          onClick={() => onSelect(loc.id)}
          className={cn(
            'shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
            selectedLocationId === loc.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:bg-zinc-300'
          )}
        >
          {isAr && loc.name_ar ? loc.name_ar : loc.name}
        </button>
      ))}
    </div>
  )
}
