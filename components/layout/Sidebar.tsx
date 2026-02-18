'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, User, Users, Network, UserCheck, UserPlus,
  Calendar, Heart, Megaphone, Music, BookOpen, BarChart3,
  Settings, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { getNavForRole, getNavSections } from '@/lib/navigation'
import type { Profile } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, User, Users, Network, UserCheck, UserPlus,
  Calendar, Heart, Megaphone, Music, BookOpen, BarChart3, Settings,
}

interface SidebarProps {
  profile: Profile
  churchName: string
  churchNameAr: string
  lang?: string
}

export function Sidebar({ profile, churchName, churchNameAr, lang = 'ar' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isRTL = lang === 'ar'

  const navItems = getNavForRole(profile.role)
  const sections = getNavSections(navItems, lang as 'ar' | 'en')

  const displayName = lang === 'ar'
    ? `${profile.first_name_ar ?? ''} ${profile.last_name_ar ?? ''}`.trim() || profile.email || 'مستخدم'
    : `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || 'User'

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success(lang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out')
    router.push('/login')
    router.refresh()
  }

  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-e border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b border-sidebar-border',
        collapsed && 'justify-center'
      )}>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{lang === 'ar' ? churchNameAr : churchName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{lang === 'ar' ? churchName : churchNameAr}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <CollapseIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {sections.map(({ section, items }) => (
          <div key={section} className="mb-6">
            {!collapsed && section && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-2 mb-2">
                {section}
              </p>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = ICON_MAP[item.iconName] ?? User
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const label = lang === 'ar' ? item.label_ar : item.label

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                      'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/80',
                      collapsed && 'justify-center'
                    )}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className={cn(
        'border-t border-sidebar-border p-3',
        collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profile.photo_url ?? undefined} alt={displayName} />
              <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            !collapsed && 'w-full justify-start gap-2'
          )}
          onClick={handleSignOut}
          title={collapsed ? (lang === 'ar' ? 'تسجيل الخروج' : 'Sign out') : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && (lang === 'ar' ? 'تسجيل الخروج' : 'Sign out')}
        </Button>
      </div>
    </aside>
  )
}
