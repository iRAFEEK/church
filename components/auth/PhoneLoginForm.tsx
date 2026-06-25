'use client'

// Phone / WhatsApp OTP login. Additive to the existing email/password method.
// Flow: enter phone → signInWithOtp({ phone }) → enter 6-digit code →
// verifyOtp({ phone, token, type: 'sms' }) → reuse post-login routing.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { createClient } from '@/lib/supabase/client'
import { analytics } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'phone' | 'code'

// E.164: leading "+", 8–15 digits.
const PHONE_RE = /^\+\d{8,15}$/
const CODE_RE = /^\d{6}$/

export function PhoneLoginForm() {
  const router = useRouter()
  const t = useTranslations('phoneAuth')

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function getLocale(): string {
    return document.cookie.match(/lang=(\w+)/)?.[1] ?? 'ar'
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const trimmed = phone.trim()
    if (!PHONE_RE.test(trimmed)) {
      toast.error(t('errorTitle'), { description: t('validationPhone') })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      // Login only — never auto-create an account from the login form (prevents
      // junk-account creation + OTP-cost abuse on unknown numbers). New members
      // arrive via onboarding/claim, not here.
      const { error } = await supabase.auth.signInWithOtp({
        phone: trimmed,
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      setPhone(trimmed)
      setStep('code')
      toast.success(t('codeSentTitle'), { description: t('codeSentDescription') })
    } catch {
      // Localized message only — don't surface raw (English-only) provider strings.
      toast.error(t('errorTitle'), { description: t('sendFailed') })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const trimmed = code.trim()
    if (!CODE_RE.test(trimmed)) {
      toast.error(t('errorTitle'), { description: t('validationCode') })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: trimmed,
        type: 'sms',
      })
      if (error) throw error

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, church_id, role')
          .eq('id', data.user.id)
          .single()

        if (profile?.church_id) {
          const locale = getLocale()
          analytics.identify({
            user_id: data.user.id,
            church_id: profile.church_id,
            role: profile.role ?? 'member',
            locale,
          })
          analytics.auth.loggedIn({
            church_id: profile.church_id,
            role: profile.role ?? 'member',
            locale,
            method: 'phone',
          })
        }

        if (profile && !profile.onboarding_completed) {
          router.push('/onboarding')
        } else {
          const { data: memberships } = await supabase
            .from('user_churches')
            .select('church_id')
            .eq('user_id', data.user.id)

          if (memberships && memberships.length > 1) {
            router.push('/select-church')
          } else {
            router.push('/')
          }
        }
        router.refresh()
      }
    } catch {
      toast.error(t('errorTitle'), { description: t('verifyFailed') })
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeNumber() {
    setStep('phone')
    setCode('')
  }

  if (step === 'phone') {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone-login">{t('phoneLabel')}</Label>
          <Input
            id="phone-login"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder={t('phonePlaceholder')}
            className="text-base"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('sending')}
            </>
          ) : (
            t('sendCodeButton')
          )}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp-code">{t('codeLabel')}</Label>
        <Input
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={6}
          placeholder={t('codePlaceholder')}
          className="text-center text-lg tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <p className="text-xs text-muted-foreground">
          {t('codeSentTo', { phone })}
        </p>
      </div>
      <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('verifying')}
          </>
        ) : (
          t('verifyButton')
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full"
        disabled={isSubmitting}
        onClick={changeNumber}
      >
        {t('changeNumber')}
      </Button>
    </form>
  )
}
