'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Building2, Check, ChevronsUpDown, Clock, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logger } from '@/lib/logger'
import type { UserChurchWithDetails } from '@/types'

interface ChurchSwitcherProps {
  churchName: string
  churchNameAr: string
}

type PendingRequest = {
  id: string
  church_id: string
  church: { id: string; name: string; name_ar: string | null; country: string } | null
}

export function ChurchSwitcher({ churchName, churchNameAr }: ChurchSwitcherProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('churchSwitcher')
  const isRTL = locale.startsWith('ar')

  const [churches, setChurches] = useState<UserChurchWithDetails[]>([])
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loaded, setLoaded] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/churches/my-churches', { signal: controller.signal }).then((r) => r.json()),
      fetch('/api/churches/my-requests', { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([mine, reqs]) => {
        if (controller.signal.aborted) return
        setChurches(Array.isArray(mine) ? mine : [])
        setRequests(Array.isArray(reqs) ? reqs : [])
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          logger.error('[ChurchSwitcher] Failed to fetch', { module: 'layout', error: e })
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
        toast.error(t('switchError'), { description: data.error })
        return
      }

      router.refresh()
    } finally {
      setSwitchingId(null)
    }
  }

  const displayName = isRTL ? churchNameAr || churchName : churchName

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

      <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-64">
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                {church.logo_url ? (
                  <Image src={church.logo_url} alt={church.name} width={20} height={20} className="h-5 w-5 rounded object-cover" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{church.country}</p>
              </div>

              {membership.is_active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              {switchingId === membership.church_id && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            </DropdownMenuItem>
          )
        })}

        {/* Pending "join another church" requests — informational, not switchable */}
        {requests.map((req) => {
          const name = isRTL ? req.church?.name_ar || req.church?.name : req.church?.name
          return (
            <div key={req.id} className="flex items-center gap-2 px-2 py-1.5 opacity-70">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{t('awaitingApproval')}</p>
              </div>
            </div>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link href="/churches/join">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">{t('joinAnother')}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
