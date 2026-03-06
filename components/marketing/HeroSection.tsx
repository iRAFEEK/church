'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronDown, Church, Users } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  const t = useTranslations('marketing')

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-0 w-[600px] h-[600px] opacity-[0.07] rounded-full blur-3xl bg-amber-500" />
        <div className="absolute bottom-0 end-0 w-[400px] h-[400px] opacity-[0.05] rounded-full blur-3xl bg-blue-500" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            {t('hero.badge')}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {t('hero.headline')}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {t('hero.subheadline')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
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
        </motion.div>
      </div>

      {/* App Mockup */}
      <motion.div
        className="relative z-10 mt-16 w-full max-w-4xl mx-auto px-4"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-muted rounded-md px-4 py-1 text-xs text-muted-foreground w-48 text-center">
                app.ekklesia.io
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-background/50 min-h-[280px] sm:min-h-[360px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="h-8 w-8 rounded-full bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Members', value: '247', color: 'text-blue-600' },
                { label: 'Visitors', value: '12', color: 'text-green-600' },
                { label: 'Groups', value: '18', color: 'text-purple-600' },
                { label: 'Events', value: '5', color: 'text-amber-600' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-border/50 p-3 bg-card">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 rounded-lg border border-border/50 p-4 bg-card">
                <div className="h-3 w-24 rounded bg-muted mb-4" />
                <div className="flex items-end gap-1.5 h-24">
                  {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-primary/20" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border/50 p-4 bg-card">
                <div className="h-3 w-20 rounded bg-muted mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted shrink-0" />
                      <div className="flex-1">
                        <div className="h-2.5 rounded bg-muted w-full" />
                        <div className="h-2 rounded bg-muted/60 w-2/3 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <a
        href="#mission"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors animate-bounce"
      >
        <ChevronDown className="h-6 w-6" />
      </a>
    </section>
  )
}
