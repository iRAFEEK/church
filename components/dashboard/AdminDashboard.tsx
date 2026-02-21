'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Users, UserPlus, CalendarCheck, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from './StatCard'
import { AttentionList } from './AttentionList'
import { UpcomingList } from './UpcomingList'
import { AttendanceTrendChart } from './charts/AttendanceTrendChart'
import { VisitorPipelineChart } from './charts/VisitorPipelineChart'
import type { AdminDashboardData } from '@/types/dashboard'

interface Props {
  data: AdminDashboardData
}

export function AdminDashboard({ data }: Props) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const trendIcons = {
    up: <TrendingUp className="h-3.5 w-3.5 text-green-600" />,
    down: <TrendingDown className="h-3.5 w-3.5 text-red-600" />,
    stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  }

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('kpiActiveMembers')}
          value={data.kpis.activeMembers.value}
          icon={Users}
          trend={data.kpis.activeMembers.trend > 0
            ? { value: data.kpis.activeMembers.trend, label: t('trendUp', { count: data.kpis.activeMembers.trend }) }
            : undefined
          }
        />
        <StatCard
          title={t('kpiNewVisitors')}
          value={data.kpis.newVisitors.value}
          icon={UserPlus}
          alert={data.kpis.newVisitors.slaAlert > 0
            ? { count: data.kpis.newVisitors.slaAlert, label: t('needAttention', { count: data.kpis.newVisitors.slaAlert }) }
            : undefined
          }
        />
        <StatCard
          title={t('kpiAttendanceRate')}
          value={`${data.kpis.attendanceRate.value}%`}
          icon={CalendarCheck}
        />
        <StatCard
          title={t('kpiUpcomingEvents')}
          value={data.kpis.upcomingEvents.value}
          icon={Calendar}
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <AttendanceTrendChart data={data.attendanceTrend} locale={locale} />
        <VisitorPipelineChart data={data.visitorPipeline} locale={locale} />
      </div>

      {/* Row 3: Attention + Upcoming */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <AttentionList items={data.attentionItems} />
        <UpcomingList items={data.upcomingThisWeek} />
      </div>

      {/* Row 4: Group Health */}
      {data.groupHealth.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('groupHealthTitle')}</CardTitle>
                <CardDescription>{t('groupHealthDesc')}</CardDescription>
              </div>
              <Link href="/admin/groups" className="text-sm text-primary hover:underline">
                {t('viewAll')}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-2 font-medium text-muted-foreground">{t('groupHealthName')}</th>
                    <th className="text-start py-2 font-medium text-muted-foreground">{t('groupHealthLeader')}</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">{t('groupHealthMembers')}</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">{t('groupHealthAttendance')}</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">{t('groupHealthAtRisk')}</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">{t('groupHealthTrend')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.groupHealth.map(group => (
                    <tr key={group.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5">
                        <Link href={`/admin/groups/${group.id}`} className="font-medium hover:underline">
                          {isAr ? (group.nameAr || group.name) : group.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {isAr ? (group.leaderNameAr || group.leaderName) : group.leaderName}
                      </td>
                      <td className="py-2.5 text-center">{group.memberCount}</td>
                      <td className="py-2.5 text-center">
                        {group.attendanceRate !== null ? (
                          <Badge
                            variant={group.attendanceRate >= 70 ? 'default' : group.attendanceRate >= 50 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {group.attendanceRate}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {group.atRiskCount > 0 ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            {group.atRiskCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {trendIcons[group.trend]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
