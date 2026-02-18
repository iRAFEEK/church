'use client'

import { useLocale } from 'next-intl'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { Profile, Church } from '@/types'

interface AppShellProps {
  profile: Profile
  church: Church
  children: React.ReactNode
  initialLang?: string
}

export function AppShell({ profile, church, children }: AppShellProps) {
  const locale = useLocale()

  function handleLangChange(newLang: 'ar' | 'en') {
    // Update cookie for SSR
    document.cookie = `lang=${newLang};path=/;max-age=31536000;samesite=lax`
    // Full reload so the root layout re-reads the cookie and provides fresh messages
    window.location.reload()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        profile={profile}
        churchName={church.name}
        churchNameAr={church.name_ar ?? church.name}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          profile={profile}
          churchName={church.name}
          churchNameAr={church.name_ar ?? church.name}
          onLangChange={handleLangChange}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
