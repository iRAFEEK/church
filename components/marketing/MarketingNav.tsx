'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Globe, Menu } from 'lucide-react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ar-eg', label: 'مصري' },
] as const

async function switchLanguage(code: string) {
  const { setLanguage } = await import('@/app/actions/lang')
  await setLanguage(code, window.location.pathname)
}

function currentLabel(locale: string) {
  return LANGUAGES.find(l => l.code === locale)?.label ?? 'EN'
}

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

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 h-16 transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">E</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Ekklesia</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-medium">
            Testing
          </span>
        </a>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Globe className="h-4 w-4" />
                {currentLabel(locale)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => switchLanguage(lang.code)}
                  className={cn(locale === lang.code && 'font-semibold')}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t('nav.login')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/welcome">{t('nav.getStarted')}</Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="flex md:hidden items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => switchLanguage(lang.code)}
                  className={cn(locale === lang.code && 'font-semibold')}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col gap-4 mt-8">
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
