'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { LayoutDashboard, Users, Calendar, BookOpen, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MoreSheet } from './MoreSheet'
import type { Profile, PermissionKey } from '@/types'

interface BottomNavProps {
  profile: Profile
  churchName: string
  churchNameAr: string
  onLangChange: (lang: 'ar' | 'en') => void
  resolvedPermissions: Record<PermissionKey, boolean>
}

const TABS = [
  { key: 'home', href: '/dashboard', icon: LayoutDashboard },
  { key: 'groups', href: '/admin/ministries', icon: Users },
  { key: 'events', href: '/events', icon: Calendar },
  { key: 'bible', href: '/bible', icon: BookOpen },
  { key: 'more', href: '#', icon: Menu },
] as const

export function BottomNav({ profile, churchName, churchNameAr, onLangChange, resolvedPermissions }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('bottomNav')
  const locale = useLocale()

  useEffect(() => { setMounted(true) }, [])

  // For members without group admin access, groups tab goes to their first group or profile
  const groupsHref = ['ministry_leader', 'super_admin', 'group_leader'].includes(profile.role)
    ? '/admin/ministries'
    : '/profile'

  const nav = (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-[9999] h-16 bg-background border-t border-border flex items-center justify-around md:hidden"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon
          const href = tab.key === 'groups' ? groupsHref : tab.href
          const isMore = tab.key === 'more'
          const isActive = isMore
            ? moreOpen
            : tab.key === 'home'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          if (isMore) {
            return (
              <button
                key={tab.key}
                onClick={() => setMoreOpen(true)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] text-xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(tab.key)}</span>
              </button>
            )
          }

          return (
            <Link
              key={tab.key}
              href={href}
              onTouchStart={() => router.prefetch(href)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(tab.key)}</span>
            </Link>
          )
        })}
      </nav>

      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        profile={profile}
        churchName={churchName}
        churchNameAr={churchNameAr}
        onLangChange={onLangChange}
        resolvedPermissions={resolvedPermissions}
      />
    </>
  )

  // Portal into document.body so no parent CSS can clip/hide the nav
  if (!mounted) return null
  return createPortal(nav, document.body)
}
