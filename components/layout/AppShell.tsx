'use client'

import { useTransition, useRef, useCallback, useMemo, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { initCapacitor } from '@/lib/capacitor/init'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { FAB } from '@/components/ui/fab'
import { TeachMeButton } from '@/components/help/TeachMeButton'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt'
import { setLanguage } from '@/app/actions/lang'
import { getNavForUser } from '@/lib/navigation'
import type { Profile, Church, PermissionKey } from '@/types'

interface AppShellProps {
  profile: Profile
  church: Church
  resolvedPermissions: Record<PermissionKey, boolean>
  children: React.ReactNode
  initialLang?: string
}

const SWIPE_THRESHOLD = 80
const SWIPE_MAX_VERTICAL = 80

export function AppShell({ profile, church, resolvedPermissions, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Initialize Capacitor native features (no-op on web)
  useEffect(() => {
    initCapacitor({
      navigate: (path) => router.push(path),
      goBack: () => router.back(),
      canGoBack: () => window.history.length > 1,
      onResume: () => router.refresh(),
    })
  }, [router])

  const navPages = useMemo(
    () => getNavForUser(profile.role, resolvedPermissions).map(item => item.href),
    [profile.role, resolvedPermissions]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = Math.abs(touch.clientY - touchStartRef.current.y)
    touchStartRef.current = null

    if (Math.abs(dx) < SWIPE_THRESHOLD || dy > SWIPE_MAX_VERTICAL) return

    // Find current page index — match exact or closest parent path
    let currentIdx = navPages.indexOf(pathname)
    if (currentIdx === -1) {
      // Try matching parent path (e.g. /admin/groups/123 → /admin/groups)
      currentIdx = navPages.findIndex(p => p !== '/' && pathname.startsWith(p))
    }
    if (currentIdx === -1) return

    // Determine direction — account for RTL
    const dir = document.documentElement.dir
    const isRTL = dir === 'rtl'
    const swipedLeft = dx < 0
    // In LTR: swipe left = next, swipe right = prev
    // In RTL: swipe left = prev, swipe right = next
    const nextIdx = (isRTL ? !swipedLeft : swipedLeft)
      ? currentIdx + 1
      : currentIdx - 1

    if (nextIdx >= 0 && nextIdx < navPages.length) {
      router.push(navPages[nextIdx])
    }
  }, [pathname, navPages, router])

  function handleLangChange(newLang: 'ar' | 'en') {
    startTransition(() => {
      setLanguage(newLang, pathname)
    })
  }

  return (
    <>
      <OfflineBanner />
      <div className="fixed inset-0 flex">
        {/* Sidebar: desktop only */}
        <div className="hidden md:block">
          <Sidebar
            profile={profile}
            churchName={church.name}
            churchNameAr={church.name_ar ?? church.name}
            resolvedPermissions={resolvedPermissions}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <Topbar
            profile={profile}
            churchName={church.name}
            churchNameAr={church.name_ar ?? church.name}
            onLangChange={handleLangChange}
          />
          <main
            className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
            style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 1rem)' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {children}
          </main>
        </div>
      </div>

      {/* FAB: context-aware quick actions */}
      <FAB profile={profile} />

      {/* TeachMe: contextual help button */}
      <TeachMeButton role={profile.role} />

      {/* Push notification permission prompt */}
      <PushPermissionPrompt />

      {/* Bottom nav: mobile only — outside overflow-hidden container */}
      <BottomNav
        profile={profile}
        churchName={church.name}
        churchNameAr={church.name_ar ?? church.name}
        onLangChange={handleLangChange}
        resolvedPermissions={resolvedPermissions}
      />
    </>
  )
}
