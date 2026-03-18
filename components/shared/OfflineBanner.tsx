'use client'

import { useEffect, useState } from 'react'
import { getPlatform } from '@/lib/capacitor/platform'

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    getPlatform().then(async (platform) => {
      if (platform === 'ios' || platform === 'android') {
        // Native: use Capacitor Network plugin (more reliable than navigator.onLine)
        const { Network } = await import('@capacitor/network')
        const status = await Network.getStatus()
        setOffline(!status.connected)
        const handle = await Network.addListener('networkStatusChange', (s) => {
          setOffline(!s.connected)
        })
        cleanup = () => handle.remove()
      } else {
        // Web: use browser online/offline events
        setOffline(!navigator.onLine)
        const on = () => setOffline(false)
        const off = () => setOffline(true)
        window.addEventListener('online', on)
        window.addEventListener('offline', off)
        cleanup = () => {
          window.removeEventListener('online', on)
          window.removeEventListener('offline', off)
        }
      }
    })

    return () => cleanup?.()
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2">
      <span>●</span>
      <span>Offline — showing cached data / بدون اتصال</span>
    </div>
  )
}
