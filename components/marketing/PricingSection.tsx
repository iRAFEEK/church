'use client'

import { useTranslations } from 'next-intl'
import { Check, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from './shared/SectionHeading'
import { AnimatedSection } from './shared/AnimatedSection'
import Link from 'next/link'

export function PricingSection() {
  const t = useTranslations('marketing')

  const features = [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <section id="support" className="py-20 sm:py-28 px-4">
      <div className="max-w-3xl mx-auto">
        <SectionHeading
          title={t('support.title')}
          subtitle={t('support.subtitle')}
        />

        {/* All-features card */}
        <AnimatedSection>
          <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-6 sm:p-8 shadow-lg shadow-primary/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {features.map((n) => (
                <div key={n} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {t(`support.feature${n}`)}
                  </span>
                </div>
              ))}
            </div>

            <Button size="lg" className="w-full h-12 text-base rounded-full" asChild>
              <Link href="/welcome">{t('support.getStartedCta')}</Link>
            </Button>
          </div>
        </AnimatedSection>

        {/* Donation callout */}
        <AnimatedSection delay={0.15}>
          <div className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold">{t('support.donateTitle')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              {t('support.donateText')}
            </p>
            <Button variant="outline" className="rounded-full gap-2" asChild>
              <a href="mailto:support@ekklesia.io">
                <Heart className="h-4 w-4" />
                {t('support.donateCta')}
              </a>
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
