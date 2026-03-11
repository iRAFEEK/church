'use client'

import { useTranslations } from 'next-intl'
import { UserPlus, Users, HandHeart, Calendar, Music, Megaphone } from 'lucide-react'
import { AnimatedSection } from './shared/AnimatedSection'
import { SectionHeading } from './shared/SectionHeading'

const cards = [
  { key: 'card1', icon: UserPlus, color: 'text-green-600 bg-green-500/10' },
  { key: 'card2', icon: Users, color: 'text-blue-600 bg-blue-500/10' },
  { key: 'card3', icon: HandHeart, color: 'text-rose-600 bg-rose-500/10' },
  { key: 'card4', icon: Calendar, color: 'text-purple-600 bg-purple-500/10' },
  { key: 'card5', icon: Music, color: 'text-amber-600 bg-amber-500/10' },
  { key: 'card6', icon: Megaphone, color: 'text-cyan-600 bg-cyan-500/10' },
]

export function CapabilitiesSection() {
  const t = useTranslations('marketing')

  return (
    <section id="capabilities" className="py-20 sm:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          title={t('capabilities.title')}
          subtitle={t('capabilities.subtitle')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <AnimatedSection key={card.key} delay={i * 0.08}>
                <div className="rounded-xl border border-border bg-card p-6 h-full hover:shadow-md transition-shadow">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">
                    {t(`capabilities.${card.key}Title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`capabilities.${card.key}Desc`)}
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
