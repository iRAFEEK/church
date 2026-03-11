'use client'

import { useTranslations } from 'next-intl'
import { Church, Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedSection } from './shared/AnimatedSection'
import { SectionHeading } from './shared/SectionHeading'
import Link from 'next/link'

export function PathsSection() {
  const t = useTranslations('marketing')

  const paths = [
    {
      icon: Church,
      title: t('paths.leadersTitle'),
      desc: t('paths.leadersDesc'),
      features: [1, 2, 3, 4].map((n) => t(`paths.leadersFeature${n}`)),
      cta: t('paths.leadersCta'),
      href: '/welcome',
      variant: 'default' as const,
    },
    {
      icon: Users,
      title: t('paths.membersTitle'),
      desc: t('paths.membersDesc'),
      features: [1, 2, 3, 4].map((n) => t(`paths.membersFeature${n}`)),
      cta: t('paths.membersCta'),
      href: '/login',
      variant: 'outline' as const,
    },
  ]

  return (
    <section id="paths" className="py-20 sm:py-28 px-4 bg-muted/20">
      <div className="max-w-5xl mx-auto">
        <SectionHeading title={t('paths.title')} />

        <AnimatedSection>
          <div className="text-center mb-12 space-y-1">
            <p className="text-base sm:text-lg font-serif italic text-muted-foreground max-w-lg mx-auto">
              {t('paths.verse')}
            </p>
            <p className="text-sm text-muted-foreground/70">{t('paths.verseRef')}</p>
          </div>
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
