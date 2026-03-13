'use client'

import { useTranslations } from 'next-intl'
import { m } from 'framer-motion'
import { Check, ArrowRight, Users, FolderPlus, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CompletionStepProps {
  churchName: string
  email: string
  country: string
}

// Lightweight CSS confetti particles
function Confetti() {
  const colors = ['bg-primary', 'bg-green-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500']
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <m.div
          key={i}
          className={`absolute w-2 h-2 rounded-full ${colors[i % colors.length]}`}
          initial={{
            x: '50%',
            y: '40%',
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${15 + Math.random() * 70}%`,
            y: `${-10 + Math.random() * 60}%`,
            scale: [0, 1, 0.5],
            opacity: [1, 1, 0],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 1.2 + Math.random() * 0.8,
            delay: Math.random() * 0.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

export function CompletionStep({ churchName, email, country }: CompletionStepProps) {
  const t = useTranslations('registration.step5')

  const tips = [
    { icon: Users, text: t('tip1') },
    { icon: FolderPlus, text: t('tip2') },
    { icon: QrCode, text: t('tip3') },
  ]

  return (
    <div className="text-center space-y-8 relative">
      <Confetti />

      {/* Animated checkmark */}
      <m.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative z-10"
      >
        <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
          <m.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </m.div>
        </div>
      </m.div>

      {/* Headline */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-2 relative z-10"
      >
        <h2 className="text-2xl font-bold tracking-tight">{t('headline')}</h2>
        <p className="text-muted-foreground text-sm">{t('subheadline')}</p>
      </m.div>

      {/* Summary */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="rounded-xl border border-border bg-card p-4 text-start space-y-3 relative z-10"
      >
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('summaryChurch')}</span>
          <span className="text-sm font-medium">{churchName}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('summaryAdmin')}</span>
          <span className="text-sm font-medium" dir="ltr">{email}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('summaryCountry')}</span>
          <span className="text-sm font-medium">{country}</span>
        </div>
      </m.div>

      {/* CTA */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="relative z-10"
      >
        <Button
          size="lg"
          className="w-full h-13 text-base rounded-full gap-2"
          asChild
        >
          <Link href="/dashboard">
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </m.div>

      {/* Tips */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 space-y-3"
      >
        <p className="text-sm font-medium text-muted-foreground">{t('tipsHeadline')}</p>
        <div className="space-y-2">
          {tips.map((tip, i) => {
            const Icon = tip.icon
            return (
              <div key={i} className="flex items-center gap-2 text-start">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{tip.text}</span>
              </div>
            )
          })}
        </div>
      </m.div>
    </div>
  )
}
