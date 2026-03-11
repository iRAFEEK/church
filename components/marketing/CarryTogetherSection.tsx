'use client'

import { useTranslations } from 'next-intl'
import { HandHeart, Heart, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedSection } from './shared/AnimatedSection'
import { SectionHeading } from './shared/SectionHeading'

const tiers = [
  { key: 'tier1', icon: HandHeart, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-200' },
  { key: 'tier2', icon: Heart, color: 'text-rose-600 bg-rose-500/10 border-rose-200' },
  { key: 'tier3', icon: Sparkles, color: 'text-amber-600 bg-amber-500/10 border-amber-200' },
]

export function CarryTogetherSection() {
  const t = useTranslations('marketing')

  return (
    <section id="carry" className="py-20 sm:py-28 px-4 bg-amber-50/30 dark:bg-amber-950/5">
      <div className="max-w-4xl mx-auto">
        <SectionHeading title={t('carry.title')} />

        <AnimatedSection>
          <div className="text-center mb-10 space-y-1">
            <p className="text-base sm:text-lg font-serif italic text-muted-foreground max-w-lg mx-auto">
              {t('carry.verse')}
            </p>
            <p className="text-sm text-muted-foreground/70">{t('carry.verseRef')}</p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <p className="text-center text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12">
            {t('carry.intro')}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {tiers.map((tier, i) => {
            const Icon = tier.icon
            const colorParts = tier.color.split(' ')
            const iconColor = colorParts[0]
            const bgColor = colorParts[1]
            const borderColor = colorParts[2]

            return (
              <AnimatedSection key={tier.key} delay={0.15 + i * 0.1}>
                <div className={`rounded-xl border ${borderColor} bg-card p-6 text-center h-full flex flex-col`}>
                  <div className={`h-12 w-12 rounded-full ${bgColor} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">
                    {t(`carry.${tier.key}Title`)}
                  </h3>
                  <span className={`text-sm font-medium ${iconColor} mb-3`}>
                    {t(`carry.${tier.key}Label`)}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {t(`carry.${tier.key}Desc`)}
                  </p>
                </div>
              </AnimatedSection>
            )
          })}
        </div>

        <AnimatedSection delay={0.5}>
          <div className="text-center space-y-5">
            <p className="text-xs text-muted-foreground/80 italic max-w-md mx-auto">
              {t('carry.transparency')}
            </p>
            <Button size="lg" className="rounded-full px-8 gap-2" asChild>
              <a href="mailto:support@ekklesia.io">
                <Heart className="h-4 w-4" />
                {t('carry.cta')}
              </a>
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
