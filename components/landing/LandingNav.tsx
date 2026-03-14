'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Globe, Menu } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'

interface LandingNavProps {
  churchName: string
  logoUrl: string | null
}

export function LandingNav({ churchName, logoUrl }: LandingNavProps) {
  const t = useTranslations('landing')
  const locale = useLocale()
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleLanguage() {
    const next = locale.startsWith('ar') ? 'en' : 'ar'
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

        {/* Desktop section links */}
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
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
            <Link href="/login">{t('navLogin')}</Link>
          </Button>

          {/* Mobile hamburger menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">{t('navAbout')}</SheetTitle>
              <div className="flex flex-col gap-4 mt-8">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium text-foreground py-2 px-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    {section.label}
                  </a>
                ))}
                <div className="border-t border-border pt-4 mt-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/login">{t('navLogin')}</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
