'use client'

import { useState, useEffect } from 'react'
import { getPlatform, type AppPlatform } from '@/lib/capacitor/platform'

/** React hook for platform detection — returns 'web' | 'ios' | 'android' */
export function usePlatform(): AppPlatform {
  const [platform, setPlatform] = useState<AppPlatform>('web')

  useEffect(() => {
    getPlatform().then(setPlatform)
  }, [])

  return platform
}
