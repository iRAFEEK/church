'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Users, Heart, ClipboardList, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { MemberInvolvementData } from '@/types'

interface MemberInvolvementCardProps {
  profileId: string
}

export function MemberInvolvementCard({ profileId }: MemberInvolvementCardProps) {
  const t = useTranslations('involvement')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const [data, setData] = useState<MemberInvolvementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/profiles/${profileId}/involvement`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setData(d) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[MemberInvolvementCard] Failed to fetch:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [profileId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin me-2" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t('emptyOverview')}
      </div>
    )
  }

  const now = new Date().toISOString()

  return (
    <Tabs defaultValue="overview" dir={isRTL ? 'rtl' : 'ltr'}>
      <TabsList className="grid w-full grid-cols-5 text-xs">
        <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
        <TabsTrigger value="events">{t('events')}</TabsTrigger>
        <TabsTrigger value="serving">{t('serving')}</TabsTrigger>
        <TabsTrigger value="groups">{t('groupsAndMinistries')}</TabsTrigger>
        <TabsTrigger value="registrations">{t('registrations')}</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
          <StatCard icon={<Calendar className="h-4 w-4" />} label={t('statEventsServed')} value={data.stats.totalEventsServed} color="text-blue-600 bg-blue-50" sub={`${data.stats.totalConfirmed} ${t('statConfirmed')} · ${data.stats.totalDeclined} ${t('statDeclined')}`} />
          <StatCard icon={<Heart className="h-4 w-4" />} label={t('statServingSignups')} value={data.stats.totalServingSignups} color="text-green-600 bg-green-50" />
          <StatCard icon={<Users className="h-4 w-4" />} label={t('statActiveGroups')} value={data.stats.activeGroups} color="text-purple-600 bg-purple-50" />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label={t('statActiveMinistries')} value={data.stats.activeMinistries} color="text-amber-600 bg-amber-50" />
          <StatCard icon={<ClipboardList className="h-4 w-4" />} label={t('statEventsRegistered')} value={data.stats.eventsRegistered} color="text-rose-600 bg-rose-50" />
        </div>
        {data.stats.totalEventsServed === 0 && data.stats.totalServingSignups === 0 && data.stats.activeGroups === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">{t('emptyOverview')}</p>
        )}
      </TabsContent>

      {/* Events */}
      <TabsContent value="events">
        {data.serviceAssignments.length === 0 ? (
          <Empty text={t('emptyAssignments')} />
        ) : (
          <div className="space-y-4 pt-4">
            <AssignmentSection
              title={t('upcoming')}
              items={data.serviceAssignments.filter(a => a.event_starts_at >= now)}
              isRTL={isRTL}
              t={t}
              locale={locale}
            />
            <AssignmentSection
              title={t('past')}
              items={data.serviceAssignments.filter(a => a.event_starts_at < now)}
              isRTL={isRTL}
              t={t}
              locale={locale}
            />
          </div>
        )}
      </TabsContent>

      {/* Serving */}
      <TabsContent value="serving">
        {data.servingSignups.length === 0 ? (
          <Empty text={t('emptyServing')} />
        ) : (
          <div className="space-y-4 pt-4">
            <ServingSection
              title={t('upcoming')}
              items={data.servingSignups.filter(s => s.slot_date >= now.slice(0, 10))}
              isRTL={isRTL}
              t={t}
              locale={locale}
            />
            <ServingSection
              title={t('past')}
              items={data.servingSignups.filter(s => s.slot_date < now.slice(0, 10))}
              isRTL={isRTL}
              t={t}
              locale={locale}
            />
          </div>
        )}
      </TabsContent>

      {/* Groups & Ministries */}
      <TabsContent value="groups">
        {data.groupMemberships.length === 0 && data.ministryMemberships.length === 0 ? (
          <Empty text={t('emptyGroups')} />
        ) : (
          <div className="space-y-4 pt-4">
            {/* Ministries */}
            {data.ministryMemberships.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('statActiveMinistries')}</p>
                <div className="space-y-2">
                  {data.ministryMemberships.map(m => (
                    <Link key={m.id} href={`/admin/ministries/${m.ministry_id}`} className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <BarChart3 className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">
                            {isRTL ? (m.ministry_name_ar || m.ministry_name) : m.ministry_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            <RoleBadge role={m.role_in_ministry} t={t} />
                            {' · '}{t('joinedAt')} {new Date(m.joined_at).toLocaleDateString(locale, { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {m.is_active ? t('activeLabel') : t('inactiveLabel')}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Groups */}
            {data.groupMemberships.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('statActiveGroups')}</p>
                <div className="space-y-2">
                  {data.groupMemberships.map(g => (
                    <Link key={g.id} href={`/groups/${g.group_id}`} className="block">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all">
                        <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">
                            {isRTL ? (g.group_name_ar || g.group_name) : g.group_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            <RoleBadge role={g.role_in_group} t={t} />
                            {g.ministry_name && (
                              <> · {t('parentMinistry')}: {isRTL ? (g.ministry_name_ar || g.ministry_name) : g.ministry_name}</>
                            )}
                          </p>
                        </div>
                        <Badge variant={g.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {g.is_active ? t('activeLabel') : t('inactiveLabel')}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* Registrations */}
      <TabsContent value="registrations">
        {data.eventRegistrations.length === 0 ? (
          <Empty text={t('emptyRegistrations')} />
        ) : (
          <div className="space-y-2 pt-4">
            {data.eventRegistrations.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white">
                <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {isRTL ? (r.event_title_ar || r.event_title) : r.event_title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(r.event_starts_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {r.event_location && ` · ${r.event_location}`}
                  </p>
                </div>
                <RegistrationBadge status={r.status} t={t} />
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: number; color: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-400 mt-1">{sub}</p>}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      {text}
    </div>
  )
}

function RoleBadge({ role, t }: { role: string; t: ReturnType<typeof useTranslations> }) {
  const labels: Record<string, string> = {
    member: t('roleMember'),
    leader: t('roleLeader'),
    co_leader: t('roleCoLeader'),
  }
  return <span>{labels[role] || role}</span>
}

function AssignmentStatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const colors: Record<string, string> = {
    assigned: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    assigned: t('statusAssigned'),
    confirmed: t('statusConfirmed'),
    declined: t('statusDeclined'),
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] || ''}`}>
      {labels[status] || status}
    </Badge>
  )
}

function ServingStatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const colors: Record<string, string> = {
    signed_up: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    signed_up: t('statusSignedUp'),
    confirmed: t('statusConfirmed'),
    cancelled: t('statusCancelled'),
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] || ''}`}>
      {labels[status] || status}
    </Badge>
  )
}

function RegistrationBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const colors: Record<string, string> = {
    registered: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    checked_in: 'bg-emerald-100 text-emerald-800',
  }
  const labels: Record<string, string> = {
    registered: t('statusRegistered'),
    confirmed: t('statusConfirmed'),
    cancelled: t('statusCancelled'),
    checked_in: t('statusCheckedIn'),
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] || ''}`}>
      {labels[status] || status}
    </Badge>
  )
}

function AssignmentSection({ title, items, isRTL, t, locale }: {
  title: string
  items: MemberInvolvementData['serviceAssignments']
  isRTL: boolean
  t: ReturnType<typeof useTranslations>
  locale: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">
        {items.map(a => {
          const team = isRTL
            ? (a.ministry_name_ar || a.ministry_name || a.group_name_ar || a.group_name)
            : (a.ministry_name || a.group_name)
          const role = isRTL ? (a.role_ar || a.role) : a.role
          return (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">
                  {isRTL ? (a.event_title_ar || a.event_title) : a.event_title}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(a.event_starts_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {team && ` · ${team}`}
                  {role && ` · ${role}`}
                </p>
              </div>
              <AssignmentStatusBadge status={a.status} t={t} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ServingSection({ title, items, isRTL, t, locale }: {
  title: string
  items: MemberInvolvementData['servingSignups']
  isRTL: boolean
  t: ReturnType<typeof useTranslations>
  locale: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">
        {items.map(s => {
          const area = isRTL ? (s.area_name_ar || s.area_name) : s.area_name
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">
                  {isRTL ? (s.slot_title_ar || s.slot_title) : s.slot_title}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(s.slot_date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {s.slot_start_time && ` · ${s.slot_start_time}`}
                  {area && ` · ${area}`}
                </p>
              </div>
              <ServingStatusBadge status={s.status} t={t} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
