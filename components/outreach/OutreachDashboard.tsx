'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogVisitDialog } from './LogVisitDialog'
import { MapPin, Phone, Calendar, Loader2, Search, AlertCircle } from 'lucide-react'
import type { OutreachMemberSummary } from '@/types'

export function OutreachDashboard() {
  const t = useTranslations('outreach')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [tab, setTab] = useState('all')
  const [members, setMembers] = useState<OutreachMemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/outreach?'
      if (tab === 'needs_followup') url += 'needs_followup=true'
      else if (tab === 'needs_visit') url += 'not_visited_days=30'

      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setMembers(json.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const getName = (m: OutreachMemberSummary) =>
    isAr
      ? `${m.first_name_ar || m.first_name || ''} ${m.last_name_ar || m.last_name || ''}`.trim()
      : `${m.first_name || ''} ${m.last_name || ''}`.trim()

  const getCity = (m: OutreachMemberSummary) =>
    isAr ? (m.city_ar || m.city) : (m.city || m.city_ar)

  const getAddress = (m: OutreachMemberSummary) =>
    isAr ? (m.address_ar || m.address) : (m.address || m.address_ar)

  const getVisitStatusColor = (lastVisitDate: string | null) => {
    if (!lastVisitDate) return 'text-red-600 bg-red-50'
    const days = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days < 30) return 'text-green-600 bg-green-50'
    if (days < 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getVisitLabel = (lastVisitDate: string | null) => {
    if (!lastVisitDate) return t('neverVisited')
    const days = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return t('lastVisit') + ': ' + t('daysAgo', { count: 0 }).replace('0', '<1')
    return t('daysAgo', { count: days })
  }

  const filtered = members.filter(m => {
    if (!search) return true
    const name = getName(m).toLowerCase()
    const city = (getCity(m) || '').toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || city.includes(q)
  })

  // Stats
  const totalMembers = members.length
  const needsVisitCount = members.filter(m => {
    if (!m.last_visit_date) return true
    const days = Math.floor((Date.now() - new Date(m.last_visit_date).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 30
  }).length
  const needsFollowupCount = members.filter(m => m.needs_followup).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t('tabAll')}</p>
          <p className="text-2xl font-bold">{totalMembers}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t('tabNeedsVisit')}</p>
          <p className="text-2xl font-bold text-yellow-600">{needsVisitCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t('tabNeedsFollowup')}</p>
          <p className="text-2xl font-bold text-orange-600">{needsFollowupCount}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('filterCity')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">{t('tabAll')}</TabsTrigger>
          <TabsTrigger value="needs_visit">{t('tabNeedsVisit')}</TabsTrigger>
          <TabsTrigger value="needs_followup">{t('tabNeedsFollowup')}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t('noVisits')}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(member => {
                const name = getName(member)
                const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
                const city = getCity(member)
                const statusColor = getVisitStatusColor(member.last_visit_date)

                return (
                  <div
                    key={member.profile_id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
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
                              <Phone className="h-3 w-3" />{member.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {member.needs_followup && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                            <AlertCircle className="h-3 w-3 me-1" />
                            {t('needsFollowup')}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                          <Calendar className="h-3 w-3 me-1" />
                          {getVisitLabel(member.last_visit_date)}
                        </Badge>
                      </div>
                    </Link>

                    <LogVisitDialog profileId={member.profile_id} onSaved={fetchMembers} />
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
