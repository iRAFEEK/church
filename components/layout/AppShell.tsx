'use client'

import { useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Clock } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { FAB } from '@/components/ui/fab'
import { TeachMeButton } from '@/components/help/TeachMeButton'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt'
import { setLanguage } from '@/app/actions/lang'
import type { Profile, Church, PermissionKey } from '@/types'

interface AppShellProps {
  profile: Profile
  church: Church
  resolvedPermissions: Record<PermissionKey, boolean>
  children: React.ReactNode
  initialLang?: string
  /** Church is awaiting platform approval — trims nav + shows an "under review" banner. */
  isPendingChurch?: boolean
  /** Caller is a platform operator — surfaces the Ekklesia Admin nav entry. */
  isPlatformAdmin?: boolean
}

export function AppShell({ profile, church, resolvedPermissions, children, isPendingChurch, isPlatformAdmin }: AppShellProps) {
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const t = useTranslations('common')

  function handleLangChange(newLang: 'ar' | 'en') {
    startTransition(() => {
      setLanguage(newLang, pathname)
    })
  }

  return (
    <>
      {/* A11Y (WCAG 2.4.1 Bypass Blocks): keyboard users can jump past the nav chrome. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:rounded-md focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        {t('skipToContent')}
      </a>
      <OfflineBanner />
      <div className="flex h-dvh overflow-hidden">
        {/* Sidebar: desktop only */}
        <div className="hidden md:block">
          <Sidebar
            profile={profile}
            churchName={church.name}
            churchNameAr={church.name_ar ?? church.name}
            resolvedPermissions={resolvedPermissions}
            isPendingChurch={isPendingChurch}
            isPlatformAdmin={isPlatformAdmin}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <Topbar
            profile={profile}
            churchName={church.name}
            churchNameAr={church.name_ar ?? church.name}
            onLangChange={handleLangChange}
          />
          {/* Bottom padding clears the bottom nav AND the floating FAB stack
              (quick-actions + help), so page content — especially bottom-aligned
              form action buttons — is never hidden behind them on mobile. */}
          <main id="main-content" className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
            style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 5rem)' }}
          >
            {isPendingChurch && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t('pendingChurchBanner')}</span>
              </div>
            )}
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
        isPendingChurch={isPendingChurch}
        isPlatformAdmin={isPlatformAdmin}
      />
    </>
  )
}
