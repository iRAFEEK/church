'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import { isFirebaseClientConfigured } from '@/lib/firebase/client'

/**
 * Banner that prompts the user to enable push notifications.
 * - Shows on every app open until they allow or deny (browser makes the final call)
 * - "Later" hides it for this session only (state is in-memory, not persisted)
 * - Disappears permanently once permission is 'granted' or 'denied'
 */
export function PushPermissionPrompt() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications()
  const [dismissedThisSession, setDismissedThisSession] = useState(false)
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false)
  const t = useTranslations('push')

  useEffect(() => {
    // Detect iOS PWA: push only works when installed to home screen on iOS
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isStandalone = ('standalone' in navigator) && (navigator as unknown as { standalone: boolean }).standalone === true
    if (isIos && !isStandalone) {
      setIsIosNotStandalone(true)
    }
  }, [])

  // Don't render if:
  // - Firebase is not configured
  // - Browser doesn't support notifications
  // - Permission already decided (granted or denied)
  // - Already subscribed
  // - Dismissed this session
  // - iOS but not installed as PWA
  if (!isFirebaseClientConfigured()) return null
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null
  if (permission === 'granted' || permission === 'denied' || permission === 'unsupported') return null
  if (isSubscribed) return null
  if (dismissedThisSession) return null
  if (isIosNotStandalone) return null

  async function handleEnable() {
    await subscribe()
    if (Notification.permission === 'granted') {
      toast.success(t('enabledSuccess'), {
        description: t('enabledDescription'),
      })
    }
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 start-4 end-4 md:start-auto md:end-4 md:w-96 z-50">
      <div className="bg-card border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{t('title')}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t('description')}
          </p>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleEnable}
              disabled={isLoading}
            >
              {isLoading ? t('enablingButton') : t('enableButton')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setDismissedThisSession(true)}
            >
              {t('laterButton')}
            </Button>
          </div>
        </div>

        <button
          onClick={() => setDismissedThisSession(true)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
