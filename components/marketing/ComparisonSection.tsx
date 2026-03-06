'use client'

import { useTranslations } from 'next-intl'
import { X, Check } from 'lucide-react'
import { SectionHeading } from './shared/SectionHeading'
import { AnimatedSection } from './shared/AnimatedSection'

export function ComparisonSection() {
  const t = useTranslations('marketing')

  const pains = [1, 2, 3, 4, 5].map((n) => t(`comparison.pain${n}`))
  const solutions = [1, 2, 3, 4, 5].map((n) => t(`comparison.solution${n}`))

  return (
    <section className="py-20 sm:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeading title={t('comparison.title')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Without */}
          <AnimatedSection direction="right" delay={0}>
            <div className="rounded-xl border border-red-200/50 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/30 p-6 sm:p-8 h-full">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-6">
                {t('comparison.without')}
              </h3>
              <ul className="space-y-4">
                {pains.map((pain, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">{pain}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          {/* With */}
          <AnimatedSection direction="left" delay={0.15}>
            <div className="rounded-xl border border-green-200/50 bg-green-50/30 dark:bg-green-950/10 dark:border-green-900/30 p-6 sm:p-8 h-full">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-6">
                {t('comparison.with')}
              </h3>
              <ul className="space-y-4">
                {solutions.map((solution, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
