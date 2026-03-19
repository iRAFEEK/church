'use client'

import { useRef, useEffect } from 'react'

import Link from 'next/link'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

type LiturgyNavSection = {
  id: string
  slug: string
  title: string
  title_ar: string
}

type LiturgyNavProps = {
  sections: LiturgyNavSection[]
  currentSlug: string
  basePath: string
  locale: string
}

export function LiturgyNav({
  sections,
  currentSlug,
  basePath,
  locale,
}: LiturgyNavProps) {
  const t = useTranslations('Liturgy')
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  // Scroll active item into view on mount
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const active = activeRef.current
      const containerRect = container.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()

      // Center the active element within the scroll container
      const scrollLeft =
        active.offsetLeft -
        container.offsetLeft -
        containerRect.width / 2 +
        activeRect.width / 2

      container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [currentSlug])

  if (!sections || sections.length === 0) {
    return null
  }

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide gap-1 px-4 py-2"
        role="navigation"
        aria-label={t('categories')}
      >
        {sections.map((section) => {
          const isActive = section.slug === currentSlug
          const label = locale === 'en' ? section.title : section.title_ar

          return (
            <Link
              key={section.id}
              ref={isActive ? activeRef : undefined}
              href={`${basePath}/${section.slug}`}
              className={cn(
                'shrink-0 inline-flex items-center justify-center rounded-full px-4 h-9 text-sm font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
