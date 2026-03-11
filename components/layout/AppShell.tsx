'use client'

import { useLocale } from 'next-intl'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { FAB } from '@/components/ui/fab'
import { TeachMeButton } from '@/components/help/TeachMeButton'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt'
import type { Profile, Church, PermissionKey } from '@/types'

interface AppShellProps {
  profile: Profile
  church: Church
  resolvedPermissions: Record<PermissionKey, boolean>
  children: React.ReactNode
  initialLang?: string
}

export function AppShell({ profile, church, resolvedPermissions, children }: AppShellProps) {
  const locale = useLocale()

  function handleLangChange(newLang: 'ar' | 'en') {
    document.cookie = `lang=${newLang};path=/;max-age=31536000;samesite=lax`
    window.location.reload()
  }

  return (
    <>
      <OfflineBanner />
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar: desktop only */}
        <div className="hidden md:block">
          <Sidebar
            profile={profile}
            churchName={church.name}
            churchNameAr={church.name_ar ?? church.name}
            resolvedPermissions={resolvedPermissions}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar
            profile={profile}
            churchName={church.name}
            churchNameAr={church.name_ar ?? church.name}
            onLangChange={handleLangChange}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6"
            style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 1rem)' }}
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
