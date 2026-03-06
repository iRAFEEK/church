'use client'

import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  ClipboardCheck,
  Megaphone,
  Music,
  HandHeart,
} from 'lucide-react'
import { SectionHeading } from './shared/SectionHeading'
import { AnimatedSection } from './shared/AnimatedSection'
import { cn } from '@/lib/utils'

const steps = [
  { key: 'step1', icon: LayoutDashboard, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { key: 'step2', icon: ClipboardCheck, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
  { key: 'step3', icon: Megaphone, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { key: 'step4', icon: Music, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { key: 'step5', icon: HandHeart, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
]

export function PastorStorySection() {
  const t = useTranslations('marketing')

  return (
    <section id="how-it-works" className="py-20 sm:py-28 px-4 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          title={t('story.title')}
          subtitle={t('story.subtitle')}
        />

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-0 bottom-0 start-6 sm:start-8 w-px bg-border" />

          <div className="space-y-8 sm:space-y-12">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <AnimatedSection
                  key={step.key}
                  delay={i * 0.12}
                  direction="left"
                >
                  <div className="relative flex items-start gap-4 sm:gap-6 ps-0">
                    {/* Icon circle */}
                    <div
                      className={cn(
                        'relative z-10 h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 flex items-center justify-center shrink-0',
                        step.color
                      )}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1 sm:pt-3">
                      <span className="inline-block text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-0.5 mb-2">
                        {t(`story.${step.key}.time`)}
                      </span>
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">
                        {t(`story.${step.key}.text`)}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
