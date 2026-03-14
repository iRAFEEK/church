'use client'

import { useTranslations } from 'next-intl'
import { m } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Church, Users } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  const t = useTranslations('marketing')

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 start-1/4 w-[500px] h-[500px] opacity-[0.06] rounded-full blur-3xl bg-amber-500" />
        <div className="absolute bottom-1/4 end-1/4 w-[400px] h-[400px] opacity-[0.04] rounded-full blur-3xl bg-blue-500" />
        {/* Subtle cross watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
          <div className="w-1 h-64 bg-current mx-auto" />
          <div className="w-48 h-1 bg-current -mt-48 mx-auto" />
        </div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8">
        {/* Scripture verse */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-1"
        >
          <p className="text-xl sm:text-2xl font-serif italic text-muted-foreground">
            {t('hero.verse')}
          </p>
          <p className="text-sm text-muted-foreground/70">{t('hero.verseRef')}</p>
        </m.div>

        {/* Headline */}
        <m.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t('hero.headline')}
        </m.h1>

        {/* Subheadline */}
        <m.p
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {t('hero.subheadline')}
        </m.p>

        {/* Dual CTAs */}
        <m.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Button size="lg" className="text-base px-8 h-12 rounded-full gap-2" asChild>
            <Link href="/welcome">
              <Church className="h-4 w-4" />
              {t('hero.ctaPrimary')}
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 h-12 rounded-full gap-2"
            asChild
          >
            <Link href="/login">
              <Users className="h-4 w-4" />
              {t('hero.ctaSecondary')}
            </Link>
          </Button>
        </m.div>
      </div>
    </section>
  )
}
