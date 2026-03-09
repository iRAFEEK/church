'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import {
  LayoutDashboard, User, Users, Network, UserCheck, UserPlus,
  Calendar, Heart, Megaphone, Music, BookOpen, BarChart3,
  Settings, LogOut, Building2, QrCode, UserRound, Bell, Globe,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getNavForUser, getNavSections, getSecondaryNavItems } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, PermissionKey } from '@/types'
import { getAvatarUrl } from '@/lib/utils/storage'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, User, Users, Network, UserCheck, UserPlus,
  Calendar, Heart, Megaphone, Music, BookOpen, BarChart3, Settings,
  Building2, QrCode, UserRound, Bell,
}

interface MoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
  churchName: string
  churchNameAr: string
  onLangChange: (lang: 'ar' | 'en') => void
  resolvedPermissions: Record<PermissionKey, boolean>
}

export function MoreSheet({
  open,
  onOpenChange,
  profile,
  churchName,
  churchNameAr,
  onLangChange,
  resolvedPermissions,
}: MoreSheetProps) {
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('moreSheet')
  const sidebarT = useTranslations('sidebar')
  const isRTL = locale === 'ar'

  const displayName = isRTL
    ? `${profile.first_name_ar ?? ''} ${profile.last_name_ar ?? ''}`.trim() || profile.email || ''
    : `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || ''

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const allItems = getNavForUser(profile.role, resolvedPermissions)
  const secondaryItems = getSecondaryNavItems(allItems)
  const sections = getNavSections(secondaryItems, locale as 'ar' | 'en')

  async function handleSignOut() {
    onOpenChange(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success(sidebarT('signedOut'))
    router.push('/login')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-2xl overflow-y-auto"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 1rem)' }}
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-start">{t('title')}</SheetTitle>
        </SheetHeader>

        {/* User card */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl(profile.photo_url, 40)} alt={displayName} />
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        </div>

        {/* Nav sections */}
        <div className="space-y-4">
          {sections.map(({ section, items }) => (
            <div key={section}>
              {section && (
                <p className="text-xs font-semibold uppercase text-muted-foreground px-2 mb-1.5">
                  {section}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon = ICON_MAP[item.iconName] ?? User
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const label = isRTL ? item.label_ar : item.label

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px]',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Footer actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 min-h-[44px]"
            onClick={() => {
              onOpenChange(false)
              onLangChange(isRTL ? 'en' : 'ar')
            }}
          >
            <Globe className="h-5 w-5" />
            {t('switchLang')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 min-h-[44px] text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            {t('signOut')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
