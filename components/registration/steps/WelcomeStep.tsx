'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Users, UserPlus, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeStepProps {
  onNext: () => void
}

const features = [
  { icon: Users, color: 'bg-blue-500/10 text-blue-500' },
  { icon: UserPlus, color: 'bg-green-500/10 text-green-500' },
  { icon: UsersRound, color: 'bg-purple-500/10 text-purple-500' },
]

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const t = useTranslations('registration.step0')

  return (
    <div className="text-center space-y-8">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto"
      >
        <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <span className="text-primary-foreground text-3xl font-bold">E</span>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="space-y-3"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t('headline')}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
          {t('subheadline')}
        </p>
      </motion.div>

      {/* Feature cards */}
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.12, duration: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${feature.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-start">{t(`feature${i + 1}`)}</p>
            </motion.div>
          )
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Button
          size="lg"
          className="text-base px-10 h-13 rounded-full w-full max-w-xs"
          onClick={onNext}
        >
          {t('cta')}
        </Button>
      </motion.div>
    </div>
  )
}
