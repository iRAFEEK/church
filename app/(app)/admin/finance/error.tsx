'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { analytics } from '@/lib/analytics'
import posthog from 'posthog-js'

export default function FinanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error')
  const pathname = usePathname()
  useEffect(() => {
    console.error(error)
    posthog.captureException(error)
    analytics.error.boundaryTriggered({
      page: pathname ?? 'unknown',
      error_message: error.message,
    })
  }, [error, pathname])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground max-w-md">{t('description')}</p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          {t('retry')}
        </Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">{t('goHome')}</a>
        </Button>
      </div>
    </div>
  )
}
