'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { Profile, Church } from '@/types'

interface AppShellProps {
  profile: Profile
  church: Church
  children: React.ReactNode
  initialLang: string
}

export function AppShell({ profile, church, children, initialLang }: AppShellProps) {
  const [lang, setLang] = useState(initialLang)

  function handleLangChange(newLang: 'ar' | 'en') {
    setLang(newLang)
    // Update cookie for SSR
    document.cookie = `lang=${newLang};path=/;max-age=31536000;samesite=lax`
    // Update html dir and lang
    document.documentElement.lang = newLang
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    // Store in localStorage as backup
    localStorage.setItem('lang', newLang)
  }

  // Sync lang from localStorage on mount (handles browser back/forward)
  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored && stored !== lang) {
      setLang(stored)
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        profile={profile}
        churchName={church.name}
        churchNameAr={church.name_ar ?? church.name}
        lang={lang}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          profile={profile}
          churchName={church.name}
          churchNameAr={church.name_ar ?? church.name}
          lang={lang}
          onLangChange={handleLangChange}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
