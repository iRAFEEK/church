'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { analytics } from '@/lib/analytics'
import posthog from 'posthog-js'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-6xl font-bold text-muted-foreground/20">!</h1>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>{t('retry')}</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            {t('goHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
