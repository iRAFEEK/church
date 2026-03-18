/**
 * Native push notification bridge for Capacitor.
 * Only imported when running inside a native app (iOS/Android).
 * Server-side push sending via firebase-admin remains unchanged —
 * it works identically for both web and native FCM tokens.
 */

import { PushNotifications } from '@capacitor/push-notifications'
import type { ActionPerformed } from '@capacitor/push-notifications'

/**
 * Request push permission and register for native notifications.
 * Returns the FCM token string, or null if permission denied / registration failed.
 */
export async function registerNativePush(): Promise<string | null> {
  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return null

  await PushNotifications.register()

  return new Promise((resolve) => {
    const registrationHandler = PushNotifications.addListener(
      'registration',
      (token) => {
        registrationHandler.then((h) => h.remove())
        resolve(token.value)
      }
    )

    const errorHandler = PushNotifications.addListener(
      'registrationError',
      () => {
        errorHandler.then((h) => h.remove())
        resolve(null)
      }
    )

    // Timeout after 10s to avoid hanging forever
    setTimeout(() => resolve(null), 10000)
  })
}

/**
 * Check current push permission state without prompting.
 * Returns 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
 */
export async function checkNativePushPermission(): Promise<string> {
  const result = await PushNotifications.checkPermissions()
  return result.receive
}

/**
 * Set up persistent listeners for push events.
 * - Foreground: notification received while app is open
 * - Action: user tapped a notification
 */
export function setupNativePushListeners(onNotificationTap: (url: string) => void) {
  // Foreground — Capacitor shows the notification natively
  // (configured via presentationOptions in capacitor.config.ts)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push/Native] Foreground:', notification.title)
  })

  // User tapped a notification
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      const url = action.notification.data?.url || '/notifications'
      onNotificationTap(url)
    }
  )
}

/** Remove all push notification listeners (cleanup) */
export async function removeAllNativePushListeners() {
  await PushNotifications.removeAllListeners()
}
