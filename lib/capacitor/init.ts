/**
 * Single initialization entry point for all Capacitor native features.
 * Called once on app mount from AppShell.
 * Skips all setup if running on web (PWA).
 */

import { getPlatform, isNativePlatform } from './platform'

interface InitCapacitorOptions {
  /** Navigate to an in-app path (e.g., from deep link or notification tap) */
  navigate: (path: string) => void
  /** Go back in browser history */
  goBack: () => void
  /** Whether the browser can go back */
  canGoBack: () => boolean
  /** Called when app returns to foreground (e.g., refresh auth session) */
  onResume: () => void
}

export async function initCapacitor(options: InitCapacitorOptions) {
  const platform = await getPlatform()
  if (!isNativePlatform()) return

  // Dynamic imports — only load native modules when running in Capacitor
  const [
    { setupDeepLinkListener },
    { setupAppLifecycle, setupBackButton },
    { SplashScreen },
    { StatusBar, Style },
  ] = await Promise.all([
    import('./deep-links'),
    import('./lifecycle'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
  ])

  // Deep links: ekklesia:// and https://app.ekklesia.io
  setupDeepLinkListener(options.navigate)

  // App lifecycle: refresh auth on resume
  setupAppLifecycle({
    onResume: options.onResume,
    onPause: () => {},
  })

  // Android hardware back button
  setupBackButton(options.goBack, options.canGoBack)

  // Status bar theming
  try {
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#09090b' })
    }
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    // StatusBar plugin may not be available on all devices
  }

  // Hide splash screen after app content is ready
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 })
  } catch {
    // SplashScreen may already be hidden
  }
}
