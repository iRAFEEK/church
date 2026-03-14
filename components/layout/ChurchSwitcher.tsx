'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Building2, Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserChurchWithDetails } from '@/types'

interface ChurchSwitcherProps {
  churchName: string
  churchNameAr: string
}

export function ChurchSwitcher({ churchName, churchNameAr }: ChurchSwitcherProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('auth')
  const isRTL = locale.startsWith('ar')

  const [churches, setChurches] = useState<UserChurchWithDetails[]>([])
  const [loaded, setLoaded] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/churches/my-churches', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { if (!controller.signal.aborted) setChurches(Array.isArray(data) ? data : []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[ChurchSwitcher] Failed to fetch:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true) })
    return () => controller.abort()
  }, [])

  async function handleSwitch(churchId: string) {
    if (switchingId) return
    setSwitchingId(churchId)
    try {
      const res = await fetch('/api/churches/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: churchId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(t('switchChurchError'), { description: data.error })
        return
      }

      router.refresh()
    } finally {
      setSwitchingId(null)
    }
  }

  const displayName = isRTL ? churchNameAr || churchName : churchName

  // Single church — just show the name, no dropdown
  if (loaded && churches.length <= 1) {
    return (
      <h2 className="font-semibold text-xs md:text-sm text-foreground truncate">
        {displayName}
      </h2>
    )
  }

  // Multiple churches — show dropdown switcher
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-0.5 px-2 gap-1 font-semibold text-xs md:text-sm max-w-[200px] justify-start"
        >
          <span className="truncate">{displayName}</span>
          {loaded ? (
            <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-60">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('yourChurches')}
          </p>
        </div>
        <DropdownMenuSeparator />

        {churches.map((membership) => {
          const church = membership.church as { id: string; name: string; name_ar: string | null; logo_url: string | null; country: string }
          const name = isRTL ? church.name_ar || church.name : church.name

          return (
            <DropdownMenuItem
              key={membership.church_id}
              className="gap-2 cursor-pointer"
              disabled={switchingId !== null}
              onSelect={() => !membership.is_active && handleSwitch(membership.church_id)}
            >
              {/* Logo / icon */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                {church.logo_url ? (
                  <Image
                    src={church.logo_url}
                    alt={church.name}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{church.country}</p>
              </div>

              {membership.is_active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              {switchingId === membership.church_id && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
