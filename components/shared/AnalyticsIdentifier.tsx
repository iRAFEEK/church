'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

interface AnalyticsIdentifierProps {
  userId: string
  churchId: string
  role: string
  locale: string
}

export function AnalyticsIdentifier({ userId, churchId, role, locale }: AnalyticsIdentifierProps) {
  useEffect(() => {
    analytics.identify({ user_id: userId, church_id: churchId, role, locale })
  }, [userId, churchId, role, locale])

  return null
}
