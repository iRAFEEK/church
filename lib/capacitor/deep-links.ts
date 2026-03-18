/**
 * Deep link handler for Capacitor.
 * Handles both custom scheme (ekklesia://) and universal links (https://app.ekklesia.io/).
 */

import { App } from '@capacitor/app'

/**
 * Listen for deep link events and navigate to the appropriate path.
 * Handles:
 *  - ekklesia://join?church=abc → /join?church=abc
 *  - https://app.ekklesia.io/join?church=abc → /join?church=abc
 */
export function setupDeepLinkListener(navigate: (path: string) => void) {
  App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url)
      const path = url.pathname + url.search
      if (path) {
        navigate(path)
      }
    } catch {
      // Invalid URL — ignore
      console.warn('[DeepLink] Could not parse URL:', event.url)
    }
  })
}
