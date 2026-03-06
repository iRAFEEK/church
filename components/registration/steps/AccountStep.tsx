'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AccountStepProps {
  email: string
  password: string
  confirmPassword: string
  onUpdate: (fields: { email?: string; password?: string; confirmPassword?: string }) => void
  onNext: () => void
  error?: string
}

export function AccountStep({
  email,
  password,
  confirmPassword,
  onUpdate,
  onNext,
  error,
}: AccountStepProps) {
  const t = useTranslations('registration.step1')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false })

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordValid = password.length >= 6
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const canProceed = emailValid && passwordValid && passwordsMatch

  function handleNext() {
    setTouched({ email: true, password: true, confirm: true })
    if (canProceed) onNext()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <Shield className="h-7 w-7 text-blue-500" />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-tight">{t('headline')}</h2>
        <p className="text-muted-foreground text-sm">{t('subheadline')}</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('emailLabel')}</label>
          <Input
            type="email"
            dir="ltr"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            className="h-13 text-base"
          />
          {touched.email && !emailValid && email.length > 0 && (
            <p className="text-xs text-destructive">{t('validationEmail')}</p>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('passwordLabel')}</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => onUpdate({ password: e.target.value })}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              className="h-13 text-base pe-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {touched.password && !passwordValid && password.length > 0 && (
            <p className="text-xs text-destructive">{t('validationPassword')}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('confirmPasswordLabel')}</label>
          <Input
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            placeholder={t('confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => onUpdate({ confirmPassword: e.target.value })}
            onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
            className="h-13 text-base"
          />
          {touched.confirm && !passwordsMatch && confirmPassword.length > 0 && (
            <p className="text-xs text-destructive">{t('validationPasswordMatch')}</p>
          )}
        </div>
      </div>

      {/* Continue */}
      <Button
        size="lg"
        className="w-full h-13 text-base rounded-full"
        onClick={handleNext}
        disabled={!canProceed}
      >
        {t('continue') || 'Continue'}
      </Button>
    </div>
  )
}
