'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Globe, Menu, X } from 'lucide-react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function MarketingNav() {
  const t = useTranslations('marketing')
  const locale = useLocale()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toggleLanguage() {
    const next = locale === 'ar' ? 'en' : 'ar'
    document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`
    window.location.reload()
  }

  const navLinks = [
    { id: 'features', label: t('nav.features') },
    { id: 'how-it-works', label: t('nav.howItWorks') },
    { id: 'who-its-for', label: t('nav.whoItsFor') },
    { id: 'support', label: t('nav.support') },
  ]

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 h-16 transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">E</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Ekklesia</span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-1.5 text-muted-foreground"
          >
            <Globe className="h-4 w-4" />
            {locale === 'ar' ? 'EN' : 'عربي'}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t('nav.login')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/welcome">{t('nav.getStarted')}</Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="text-muted-foreground"
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="h-px bg-border" />
                <Button variant="outline" asChild>
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/welcome">{t('nav.getStarted')}</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
