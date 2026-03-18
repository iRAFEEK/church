'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Messaging } from 'firebase/messaging'
import { getFirebaseMessaging, isFirebaseClientConfigured } from '@/lib/firebase/client'
import { getPlatform, getPlatformSync, isNativePlatform } from '@/lib/capacitor/platform'

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface UsePushNotificationsReturn {
  permission: PushPermissionState
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermissionState>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentToken, setCurrentToken] = useState<string | null>(null)

  // On mount: detect platform, check permission state, refresh token if granted
  useEffect(() => {
    if (typeof window === 'undefined') return

    getPlatform().then(async (platform) => {
      if (platform === 'ios' || platform === 'android') {
        await initNative()
      } else {
        initWeb()
      }
    })
  }, [])

  // --- Native (Capacitor) flow ---

  async function initNative() {
    try {
      const { checkNativePushPermission } = await import('@/lib/capacitor/push')
      const status = await checkNativePushPermission()

      if (status === 'granted') {
        setPermission('granted')
        await refreshTokenNative()
      } else if (status === 'denied') {
        setPermission('denied')
      } else {
        setPermission('default')
      }
    } catch (error) {
      console.warn('[Push/Native] Init failed:', error)
    }
  }

  async function refreshTokenNative() {
    try {
      const { registerNativePush, setupNativePushListeners } = await import('@/lib/capacitor/push')
      const token = await registerNativePush()

      if (token) {
        setCurrentToken(token)
        setIsSubscribed(true)

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, deviceHint: getDeviceHint() }),
        })

        // Set up notification tap listener
        setupNativePushListeners((url) => {
          // Navigate via window.location — works in Capacitor WebView
          window.location.href = url
        })
      }
    } catch (error) {
      console.warn('[Push/Native] Token refresh failed:', error)
      setIsSubscribed(false)
    }
  }

  async function subscribeNative() {
    setIsLoading(true)
    try {
      const { registerNativePush, setupNativePushListeners } = await import('@/lib/capacitor/push')
      const token = await registerNativePush()

      if (!token) {
        setPermission('denied')
        setIsLoading(false)
        return
      }

      setPermission('granted')
      setCurrentToken(token)

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceHint: getDeviceHint() }),
      })

      if (res.ok) {
        setIsSubscribed(true)
      }

      setupNativePushListeners((url) => {
        window.location.href = url
      })
    } catch (error) {
      console.error('[Push/Native] Subscribe failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Web (browser FCM) flow ---

  function initWeb() {
    if (!('Notification' in window)) return
    if (!isFirebaseClientConfigured()) return

    setPermission(Notification.permission as PushPermissionState)

    // Pre-register the SW immediately so it's active before the user clicks Enable
    getServiceWorkerRegistration()

    if (Notification.permission === 'granted') {
      refreshTokenWeb()
    }
  }

  async function refreshTokenWeb() {
    try {
      const messaging = await getFirebaseMessaging()
      if (!messaging) return

      const { getToken } = await import('firebase/messaging')
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await getServiceWorkerRegistration(),
      })

      if (token) {
        setCurrentToken(token)
        setIsSubscribed(true)

        // Re-register token on every app open to refresh last_used_at
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, deviceHint: getDeviceHint() }),
        })

        // Listen for foreground messages (app is open)
        const { onMessage } = await import('firebase/messaging')
        onMessage(messaging, (payload) => {
          console.log('[Push] Foreground message received:', payload.notification?.title)
        })

        // Listen for token refresh
        setupTokenRefresh(messaging)
      }
    } catch (error) {
      console.warn('[Push] Token refresh failed:', error)
      setIsSubscribed(false)
    }
  }

  function setupTokenRefresh(messaging: Messaging) {
    const { onTokenRefresh } = require('firebase/messaging')
    if (typeof onTokenRefresh !== 'function') return

    onTokenRefresh(messaging, async () => {
      try {
        const { getToken } = await import('firebase/messaging')
        const newToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: await getServiceWorkerRegistration(),
        })
        if (newToken) {
          setCurrentToken(newToken)
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: newToken, deviceHint: getDeviceHint() }),
          })
        }
      } catch (error) {
        console.warn('[Push] Token refresh handler failed:', error)
      }
    })
  }

  async function subscribeWeb() {
    if (!('Notification' in window)) return

    setIsLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermissionState)

      if (result !== 'granted') {
        setIsLoading(false)
        return
      }

      const messaging = await getFirebaseMessaging()
      if (!messaging) {
        console.warn('[Push] Firebase messaging not available')
        setIsLoading(false)
        return
      }

      const { getToken } = await import('firebase/messaging')
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await getServiceWorkerRegistration(),
      })

      if (!token) {
        console.warn('[Push] No token returned from FCM')
        setIsLoading(false)
        return
      }

      setCurrentToken(token)

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceHint: getDeviceHint() }),
      })

      if (res.ok) {
        setIsSubscribed(true)
      }

      // Start listening for foreground messages
      const { onMessage } = await import('firebase/messaging')
      onMessage(messaging, (payload) => {
        console.log('[Push] Foreground message received:', payload.notification?.title)
      })
    } catch (error) {
      console.error('[Push] Subscribe failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Unified API ---

  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (isNativePlatform()) {
      await subscribeNative()
    } else {
      await subscribeWeb()
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    if (!currentToken) return
    setIsLoading(true)
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
      })
      setIsSubscribed(false)
      setCurrentToken(null)

      // Cleanup native listeners if applicable
      if (isNativePlatform()) {
        const { removeAllNativePushListeners } = await import('@/lib/capacitor/push')
        await removeAllNativePushListeners()
      }
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentToken])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}

// --- Helpers ---

/** Service worker registration — web only (service workers don't exist in Capacitor WebViews) */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    // Wait for the service worker to become active before returning
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', function handler(e) {
          if ((e.target as ServiceWorker).state === 'activated') {
            registration.installing?.removeEventListener('statechange', handler)
            resolve()
          }
        })
      })
    }

    // Also ensure the controller is ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        // Fallback timeout in case controllerchange doesn't fire
        setTimeout(resolve, 3000)
      })
    }

    return registration
  } catch {
    return undefined
  }
}

function getDeviceHint(): string {
  if (typeof window === 'undefined') return ''
  // Capacitor native apps
  const platform = getPlatformSync()
  if (platform === 'ios') return 'Capacitor/iOS'
  if (platform === 'android') return 'Capacitor/Android'
  // Fallback to UA detection for web
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return 'Safari/iOS'
  if (/Android/.test(ua)) return 'Chrome/Android'
  if (/Mac/.test(ua)) return 'Safari/macOS'
  return 'Chrome/Desktop'
}
