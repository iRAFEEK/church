/**
 * Platform detection for Capacitor native apps.
 * All imports of @capacitor/core are dynamic to avoid SSR crashes.
 */

export type AppPlatform = 'web' | 'ios' | 'android'

let cachedPlatform: AppPlatform | null = null

/** Async platform detection — call once on app init, then use getPlatformSync() */
export async function getPlatform(): Promise<AppPlatform> {
  if (typeof window === 'undefined') return 'web'
  if (cachedPlatform) return cachedPlatform

  try {
    const { Capacitor } = await import('@capacitor/core')
    const platform = Capacitor.getPlatform()
    cachedPlatform =
      platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'web'
  } catch {
    cachedPlatform = 'web'
  }
  return cachedPlatform
}

/** Synchronous check — only valid after getPlatform() has resolved */
export function getPlatformSync(): AppPlatform {
  return cachedPlatform ?? 'web'
}

/** Whether the app is running inside a Capacitor native shell */
export function isNativePlatform(): boolean {
  return cachedPlatform === 'ios' || cachedPlatform === 'android'
}
