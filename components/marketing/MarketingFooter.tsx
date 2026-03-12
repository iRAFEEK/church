'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
] as const

function switchLanguage(code: string) {
  document.cookie = `lang=${code}; path=/; max-age=${60 * 60 * 24 * 365}`
  window.location.reload()
}

function currentLabel(locale: string) {
  return LANGUAGES.find(l => l.code === locale)?.label ?? 'EN'
}

export function MarketingFooter() {
  const t = useTranslations('marketing')
  const locale = useLocale()

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">E</span>
            </div>
            <span className="font-semibold tracking-tight">Ekklesia</span>
            <span className="text-sm text-muted-foreground">
              — {t('footer.tagline')}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{t('footer.copyright')}</span>
            <a href="#" className="hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t('footer.terms')}
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground text-xs h-7 px-2"
                >
                  <Globe className="h-3.5 w-3.5" />
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
          </div>
        </div>
      </div>
    </footer>
  )
}
