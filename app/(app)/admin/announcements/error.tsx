'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { analytics } from '@/lib/analytics'
import posthog from 'posthog-js'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
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
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-zinc-500 text-sm">{t('description')}</p>
      <Button variant="outline" size="sm" onClick={reset}>{t('retry')}</Button>
    </div>
  )
}
