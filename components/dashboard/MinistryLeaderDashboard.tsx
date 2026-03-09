'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Users, CalendarCheck, BarChart3, Calendar, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from './StatCard'
import { AttentionList } from './AttentionList'
import type { MinistryLeaderDashboardData } from '@/types/dashboard'

interface Props {
  data: MinistryLeaderDashboardData
}

export function MinistryLeaderDashboard({ data }: Props) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const ministryName = isAr ? (data.ministryNameAr || data.ministryName) : data.ministryName

  return (
    <div className="space-y-6">
      {/* Ministry header */}
      <div className="flex items-center gap-3 px-1">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <span className="text-lg font-semibold">{ministryName}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('kpiActiveMembers')}
          value={data.memberCount}
          icon={Users}
        />
        <StatCard
          title={t('mlGroups')}
          value={data.groupCount}
          icon={Users}
        />
        <StatCard
          title={t('kpiAttendanceRate')}
          value={data.attendanceRate > 0 ? `${data.attendanceRate}%` : '—'}
          icon={CalendarCheck}
        />
        <StatCard
          title={t('kpiUpcomingEvents')}
          value={data.upcomingEvents.length}
          icon={Calendar}
        />
      </div>

      {/* Attendance Trend */}
      {data.attendanceTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('chartAttendanceTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {data.attendanceTrend.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/20 rounded-t-sm min-h-[4px]"
                    style={{ height: `${Math.max(point.rate, 4)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{point.weekLabel}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column: Events + Assignments */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('mlUpcomingEvents')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('mlNoEvents')}</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingEvents.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">
                      {isAr ? (e.titleAr || e.title) : e.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(e.startsAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Service Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('mlMyAssignments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.serviceAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('mlNoAssignments')}</p>
            ) : (
              <div className="space-y-2">
                {data.serviceAssignments.map((a, i) => (
                  <div key={i} className="p-2 rounded-md bg-muted/30">
                    <p className="text-sm font-medium">
                      {isAr ? (a.eventTitleAr || a.eventTitle) : a.eventTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {(a.role || a.roleAr) && (
                        <Badge variant="secondary" className="text-[10px]">
                          {isAr ? (a.roleAr || a.role) : a.role}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.startsAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attention Items */}
      {data.attentionItems.length > 0 && (
        <AttentionList items={data.attentionItems} />
      )}

      {/* Group Health */}
      {data.groupHealth.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('sectionGroupHealth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.groupHealth.map(g => {
                const name = isAr ? (g.nameAr || g.name) : g.name
                return (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.memberCount} {t('kpiGroupMembers').toLowerCase()}
                      </p>
                    </div>
                    {g.atRiskCount > 0 && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                        {g.atRiskCount} {t('leaderAtRiskTitle').split(' ')[0]}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
