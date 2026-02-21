'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Users, CalendarCheck, HandHeart, Calendar, UserRound, Plus, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatCard } from './StatCard'
import type { LeaderDashboardData } from '@/types/dashboard'

interface Props {
  data: LeaderDashboardData
}

export function LeaderDashboard({ data }: Props) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const isAr = locale === 'ar'

  // Use first group for stats (most leaders have one group)
  const primaryGroup = data.groups[0]

  // Calculate days until next gathering
  const getGatheringCountdown = (scheduledAt: string) => {
    const diff = Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return t('today')
    if (diff === 1) return t('tomorrow')
    return t('inDays', { count: diff })
  }

  // Total stats across all groups
  const totalMembers = data.groups.reduce((sum, g) => sum + g.memberCount, 0)
  const totalPrayers = data.groups.reduce((sum, g) => sum + g.activePrayerCount, 0)
  const avgRate = data.groups.length > 0
    ? Math.round(data.groups.reduce((sum, g) => sum + (g.attendanceRate || 0), 0) / data.groups.length)
    : null

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('kpiGroupMembers')}
          value={totalMembers}
          icon={Users}
        />
        <StatCard
          title={t('kpiAttendanceRate')}
          value={avgRate !== null ? `${avgRate}%` : '—'}
          icon={CalendarCheck}
        />
        <StatCard
          title={t('kpiActivePrayers')}
          value={totalPrayers}
          icon={HandHeart}
        />
        <StatCard
          title={t('kpiNextGathering')}
          value={primaryGroup?.nextGathering
            ? getGatheringCountdown(primaryGroup.nextGathering.scheduledAt)
            : '—'}
          icon={Calendar}
        />
      </div>

      {/* Row 2: At-Risk + Prayers */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* At-Risk Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('leaderAtRiskTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.atRiskMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('leaderAtRiskEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {data.atRiskMembers.map(member => {
                  const name = isAr ? (member.nameAr || member.name) : member.name
                  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
                  return (
                    <Link
                      key={member.id}
                      href={`/admin/members/${member.id}`}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoUrl || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.daysAbsent >= 999
                            ? t('leaderAtRiskNeverSeen')
                            : t('leaderAtRiskLastSeen', { days: member.daysAbsent })}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs shrink-0">
                        {t('leaderAtRiskTitle').split(' ')[0]}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Prayers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('leaderPrayersTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPrayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('leaderPrayersEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {data.recentPrayers.map(prayer => (
                  <div key={prayer.id} className="p-2.5 rounded-md bg-muted/30">
                    <p className="text-sm line-clamp-2">{prayer.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {isAr ? (prayer.submitterNameAr || prayer.submitterName) : prayer.submitterName}
                      </span>
                      {prayer.isPrivate && (
                        <Badge variant="outline" className="text-xs">{t('leaderPrayersPrivate')}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Quick Actions + Recent Gatherings */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('leaderQuickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryGroup && (
              <Link href={`/groups/${primaryGroup.id}/gathering/new`}>
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 me-2" />
                  {t('leaderStartGathering')}
                </Button>
              </Link>
            )}
            {data.assignedVisitorCount > 0 && (
              <Link href="/visitors">
                <Button className="w-full justify-start" variant="outline">
                  <Eye className="h-4 w-4 me-2" />
                  {t('leaderViewVisitors')}
                  <Badge variant="secondary" className="ms-auto">{data.assignedVisitorCount}</Badge>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Gatherings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('leaderRecentGatherings')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentGatherings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('leaderNoGatherings')}</p>
            ) : (
              <div className="space-y-2">
                {data.recentGatherings.map(g => {
                  const date = new Date(g.scheduledAt)
                  return (
                    <Link
                      key={g.id}
                      href={`/groups/${g.groupId}/gathering/${g.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {isAr ? (g.groupNameAr || g.groupName) : g.groupName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                          {g.topic ? ` · ${g.topic}` : ''}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {g.presentCount}/{g.totalCount}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
