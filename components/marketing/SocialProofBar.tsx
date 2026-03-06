'use client'

import { useTranslations } from 'next-intl'
import { AnimatedSection } from './shared/AnimatedSection'
import { Heart, Church, Globe } from 'lucide-react'

export function SocialProofBar() {
  const t = useTranslations('marketing')

  const pillars = [
    { icon: Heart, title: t('mission.pillar1Title'), desc: t('mission.pillar1Desc') },
    { icon: Church, title: t('mission.pillar2Title'), desc: t('mission.pillar2Desc') },
    { icon: Globe, title: t('mission.pillar3Title'), desc: t('mission.pillar3Desc') },
  ]

  return (
    <section id="mission" className="py-16 sm:py-24 border-y border-border/50 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4">
        <AnimatedSection className="text-center mb-12 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('mission.headline')}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('mission.text')}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {pillars.map((pillar, i) => (
            <AnimatedSection key={pillar.title} delay={i * 0.15}>
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <pillar.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
