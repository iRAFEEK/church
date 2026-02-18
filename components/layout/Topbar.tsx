'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Profile } from '@/types'

interface TopbarProps {
  profile: Profile
  churchName: string
  churchNameAr: string
  onLangChange: (lang: 'ar' | 'en') => void
}

export function Topbar({ profile, churchName, churchNameAr, onLangChange }: TopbarProps) {
  const locale = useLocale()
  const t = useTranslations('topbar')
  const isRTL = locale === 'ar'

  const displayName = isRTL
    ? `${profile.first_name_ar ?? ''} ${profile.last_name_ar ?? ''}`.trim() || profile.email || ''
    : `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || ''

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
      {/* Church name */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-sm text-foreground truncate">
          {isRTL ? churchNameAr : churchName}
        </h2>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-semibold h-8 px-3"
          onClick={() => onLangChange(isRTL ? 'en' : 'ar')}
        >
          {t('langToggle')}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.photo_url ?? undefined} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {initials || '?'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile">
                {t('myProfile')}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/profile/edit">
                {t('editProfile')}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
