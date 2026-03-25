'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface ConferenceTabNavProps {
  eventId: string
}

export function ConferenceTabNav({ eventId }: ConferenceTabNavProps) {
  const pathname = usePathname()
  const t = useTranslations('conference')

  const tabs = [
    { key: 'board', label: t('board') },
    { key: 'publish', label: t('publish') },
    { key: 'structure', label: t('structure') },
    { key: 'volunteers', label: t('volunteers') },
    { key: 'tasks', label: t('tasks') },
    { key: 'resources', label: t('resources') },
    { key: 'broadcasts', label: t('broadcasts') },
    { key: 'dashboard', label: t('dashboard') },
  ]

  return (
    <div className="flex gap-1 overflow-x-auto border-b scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
      {tabs.map((tab) => {
        const href = `/admin/events/${eventId}/conference/${tab.key}`
        const isActive = pathname.includes(`/conference/${tab.key}`)
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              'shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
