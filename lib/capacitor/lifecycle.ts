/**
 * App lifecycle handlers for Capacitor.
 * Manages foreground/background transitions and Android back button.
 */

import { App } from '@capacitor/app'

/** Listen for app foreground/background state changes */
export function setupAppLifecycle(options: {
  onResume: () => void
  onPause: () => void
}) {
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      options.onResume()
    } else {
      options.onPause()
    }
  })
}

/** Handle Android hardware back button */
export function setupBackButton(
  goBack: () => void,
  canGoBack: () => boolean
) {
  App.addListener('backButton', () => {
    if (canGoBack()) {
      goBack()
    } else {
      App.exitApp()
    }
  })
}
