'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface LandingNavProps {
  churchName: string
  logoUrl: string | null
}

export function LandingNav({ churchName, logoUrl }: LandingNavProps) {
  const t = useTranslations('landing')
  const locale = useLocale()

  function toggleLanguage() {
    const next = locale === 'ar' ? 'en' : 'ar'
    document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`
    window.location.reload()
  }

  const sections = [
    { id: 'about', label: t('navAbout') },
    { id: 'leaders', label: t('navLeadership') },
    { id: 'join', label: t('navJoin') },
  ]

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4 sm:px-6">
        {/* Church name / logo */}
        <a href="#" className="flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={churchName} width={32} height={32} sizes="32px" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                {churchName.charAt(0)}
              </span>
            </div>
          )}
          <span className="font-semibold text-lg hidden sm:inline">{churchName}</span>
        </a>

        {/* Section links */}
        <div className="hidden md:flex items-center gap-6">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {section.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Toggle language">
            <Globe className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">{t('navLogin')}</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
