'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function MarketingFooter() {
  const t = useTranslations('marketing')
  const locale = useLocale()

  function toggleLanguage() {
    const next = locale === 'ar' ? 'en' : 'ar'
    document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`
    window.location.reload()
  }

  const columns = [
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.features'), href: '#features' },
        { label: t('footer.demo'), href: '#features' },
      ],
    },
    {
      title: t('footer.ministry'),
      links: [
        { label: t('footer.support'), href: '#support' },
        { label: t('footer.contact'), href: 'mailto:support@ekklesia.io' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.privacy'), href: '#' },
        { label: t('footer.terms'), href: '#' },
      ],
    },
  ]

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main footer */}
        <div className="py-12 sm:py-16 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">E</span>
              </div>
              <span className="font-bold text-lg tracking-tight">Ekklesia</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t('footer.copyright')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-1.5 text-muted-foreground text-xs"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'ar' ? 'English' : 'العربية'}
          </Button>
        </div>
      </div>
    </footer>
  )
}
