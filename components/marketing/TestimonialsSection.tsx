'use client'

import { useTranslations } from 'next-intl'
import { Church, Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from './shared/SectionHeading'
import { AnimatedSection } from './shared/AnimatedSection'
import Link from 'next/link'

export function TestimonialsSection() {
  const t = useTranslations('marketing')

  const paths = [
    {
      icon: Church,
      title: t('whoItsFor.leadersTitle'),
      desc: t('whoItsFor.leadersDesc'),
      features: [1, 2, 3, 4].map((n) => t(`whoItsFor.leadersFeature${n}`)),
      cta: t('whoItsFor.leadersCta'),
      href: '/welcome',
      variant: 'default' as const,
    },
    {
      icon: Users,
      title: t('whoItsFor.membersTitle'),
      desc: t('whoItsFor.membersDesc'),
      features: [1, 2, 3, 4].map((n) => t(`whoItsFor.membersFeature${n}`)),
      cta: t('whoItsFor.membersCta'),
      href: '/login',
      variant: 'outline' as const,
    },
  ]

  return (
    <section id="who-its-for" className="py-20 sm:py-28 px-4 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <SectionHeading title={t('whoItsFor.title')} />

        <AnimatedSection>
          <p className="text-center text-muted-foreground italic text-base sm:text-lg mb-12 max-w-md mx-auto">
            {t('whoItsFor.verse')}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paths.map((path, i) => (
            <AnimatedSection key={path.title} delay={i * 0.15}>
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8 h-full flex flex-col">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <path.icon className="h-5 w-5 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-2">{path.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {path.desc}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {path.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full rounded-full" variant={path.variant} asChild>
                  <Link href={path.href}>{path.cta}</Link>
                </Button>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
