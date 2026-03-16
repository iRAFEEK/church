'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogVisitDialog } from './LogVisitDialog'
import { MapPin, Phone, Search, Users, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OutreachMemberSummary } from '@/types'

interface Props {
  initialMembers: OutreachMemberSummary[]
  stats: {
    total: number
    needsVisit: number
    needsFollowup: number
  }
}

export function OutreachMemberList({ initialMembers, stats }: Props) {
  const t = useTranslations('outreach')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [members] = useState(initialMembers)

  const getName = (m: OutreachMemberSummary) =>
    isAr
      ? `${m.first_name_ar || m.first_name || ''} ${m.last_name_ar || m.last_name || ''}`.trim()
      : `${m.first_name || ''} ${m.last_name || ''}`.trim()

  const getCity = (m: OutreachMemberSummary) =>
    isAr ? (m.city_ar || m.city) : (m.city || m.city_ar)

  const getVisitDotColor = (lastVisitDate: string | null) => {
    if (!lastVisitDate) return 'bg-red-500'
    const days = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days < 30) return 'bg-emerald-500'
    if (days < 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getVisitLabel = (lastVisitDate: string | null) => {
    if (!lastVisitDate) return t('neverVisited')
    const days = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return t('daysAgo', { count: 0 }).replace('0', '<1')
    return t('daysAgo', { count: days })
  }

  const filtered = useMemo(() => {
    let list = members

    // Tab filter
    if (tab === 'needs_visit') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      list = list.filter(m => !m.last_visit_date || m.last_visit_date < cutoffStr)
    } else if (tab === 'needs_followup') {
      list = list.filter(m => m.needs_followup)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => {
        const name = getName(m).toLowerCase()
        const city = (getCity(m) || '').toLowerCase()
        return name.includes(q) || city.includes(q)
      })
    }

    return list
  }, [members, tab, search])

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {/* Stat cards with icons */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-muted-foreground">{t('tabAll')}</p>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-muted-foreground">{t('tabNeedsVisit')}</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.needsVisit}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">{t('tabNeedsFollowup')}</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.needsFollowup}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ps-9 text-base"
          dir="auto"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {(['all', 'needs_visit', 'needs_followup'] as const).map(f => (
          <button
            key={f}
            onClick={() => setTab(f)}
            className={cn(
              'px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]',
              tab === f
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {f === 'all' ? t('tabAll') : f === 'needs_visit' ? t('tabNeedsVisit') : t('tabNeedsFollowup')}
          </button>
        ))}
      </div>

      {/* Member list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('emptyTitle')}</h3>
          <p className="text-sm text-zinc-500 max-w-[260px]">{t('emptyBody')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
          {filtered.map(member => {
            const name = getName(member)
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
            const city = getCity(member)
            const dotColor = getVisitDotColor(member.last_visit_date)

            return (
              <div
                key={member.profile_id}
                className="flex items-center gap-3 py-3.5 px-4 hover:bg-zinc-50/50 transition-colors"
              >
                <Link href={`/admin/outreach/${member.profile_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={member.photo_url || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {city && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{city}
                        </span>
                      )}
                      {member.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /><span dir="ltr">{member.phone}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} />
                      <span className="text-xs text-zinc-500">{getVisitLabel(member.last_visit_date)}</span>
                      {member.needs_followup && (
                        <span className="text-xs font-medium text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                          {t('needsFollowup')}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0 rtl:rotate-180" />
                </Link>

                <LogVisitDialog profileId={member.profile_id} onSaved={handleRefresh} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
