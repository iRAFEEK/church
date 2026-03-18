'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { LayoutDashboard, Users, Building2, Calendar, Menu } from 'lucide-react'
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
  { key: 'home', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { key: 'groups', href: '/admin/groups', icon: Users, roles: null },
  { key: 'ministries', href: '/admin/ministries', icon: Building2, roles: ['ministry_leader', 'super_admin'] as string[] },
  { key: 'events', href: '/events', icon: Calendar, roles: null },
  { key: 'more', href: '#', icon: Menu, roles: null },
] as const

export function BottomNav({ profile, churchName, churchNameAr, onLangChange, resolvedPermissions }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('bottomNav')
  const locale = useLocale()

  useEffect(() => { setMounted(true) }, [])

  // Groups tab: admins see all groups, everyone else goes to my-group (redirects to their group)
  const groupsHref = profile.role === 'super_admin'
    ? '/admin/groups'
    : '/my-group'

  // Filter tabs by role
  const visibleTabs = TABS.filter(tab =>
    tab.roles === null || tab.roles.includes(profile.role)
  )

  const nav = (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-[9999] h-16 bg-background border-t border-border flex items-center justify-around md:hidden"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        {visibleTabs.map(tab => {
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
