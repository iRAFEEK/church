'use client'

import { useTranslations } from 'next-intl'
import { Heart, Globe, Sparkles } from 'lucide-react'
import { AnimatedSection } from './shared/AnimatedSection'
import { SectionHeading } from './shared/SectionHeading'

const pillars = [
  { key: 'pillar1', icon: Heart, color: 'text-red-500 bg-red-500/10' },
  { key: 'pillar2', icon: Globe, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'pillar3', icon: Sparkles, color: 'text-amber-500 bg-amber-500/10' },
]

export function MissionSection() {
  const t = useTranslations('marketing')

  return (
    <section id="mission" className="py-20 sm:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeading title={t('mission.title')} />

        <AnimatedSection>
          <p className="text-center font-serif italic text-muted-foreground text-base sm:text-lg max-w-lg mx-auto mb-14">
            {t('mission.subtitle')}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon
            return (
              <AnimatedSection key={pillar.key} delay={i * 0.12}>
                <div className="text-center space-y-4 p-6">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${pillar.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    {t(`mission.${pillar.key}Title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`mission.${pillar.key}Desc`)}
                  </p>
                </div>
              </AnimatedSection>
            )
          })}
        </div>
      </div>
    </section>
  )
}
