'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { CalendarCheck, Trophy, Users, Bell, Calendar, Heart, Megaphone, Pin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from './StatCard'
import type { MemberDashboardData } from '@/types/dashboard'

interface Props {
  data: MemberDashboardData
}

export function MemberDashboard({ data }: Props) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const isAr = locale === 'ar'

  return (
    <div className="space-y-6">
      {/* Row 1: Personal KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('kpiMyAttendance')}
          value={data.kpis.attendanceRate !== null ? `${data.kpis.attendanceRate}%` : '—'}
          icon={CalendarCheck}
        />
        <StatCard
          title={t('kpiMyMilestones')}
          value={data.kpis.milestoneCount}
          icon={Trophy}
        />
        <StatCard
          title={t('kpiMyGroups')}
          value={data.kpis.groupCount}
          icon={Users}
        />
        <StatCard
          title={t('kpiUnreadNotifications')}
          value={data.kpis.unreadNotifications}
          icon={Bell}
          alert={data.kpis.unreadNotifications > 0
            ? { count: data.kpis.unreadNotifications, label: t('unread') }
            : undefined
          }
        />
      </div>

      {/* Row 2: My Groups + Upcoming Events */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* My Groups */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('myGroupsTitle')}</CardTitle>
              {data.myGroups.length > 0 && (
                <Link href="/admin/groups" className="text-sm text-primary hover:underline">
                  {t('viewAll')}
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.myGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('myGroupsEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {data.myGroups.map(group => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="block p-3 rounded-md border hover:bg-muted/30 transition-colors"
                  >
                    <p className="font-medium text-sm">
                      {isAr ? (group.nameAr || group.name) : group.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('myGroupsLeader', {
                        name: isAr ? (group.leaderNameAr || group.leaderName) : group.leaderName
                      })}
                    </p>
                    {group.nextGathering && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-primary">
                        <Calendar className="h-3 w-3" />
                        {t('myGroupsNextGathering', {
                          date: new Date(group.nextGathering).toLocaleDateString(
                            isAr ? 'ar-EG' : 'en-US',
                            { weekday: 'short', month: 'short', day: 'numeric' }
                          )
                        })}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('upcomingEventsTitle')}</CardTitle>
              <Link href="/events" className="text-sm text-primary hover:underline">
                {t('viewAll')}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('upcomingEventsEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingEvents.map(event => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {isAr ? (event.titleAr || event.title) : event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.startsAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    {event.isRegistered && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {t('upcomingEventsRegistered')}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Serving + Announcements */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* My Serving */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('myServingTitle')}</CardTitle>
              <Link href="/serving" className="text-sm text-primary hover:underline">
                {t('viewAll')}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.servingSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('myServingEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {data.servingSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30"
                  >
                    <Heart className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {isAr ? (slot.titleAr || slot.title) : slot.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(slot.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                        {' · '}
                        {isAr ? (slot.areaNameAr || slot.areaName) : slot.areaName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('recentAnnouncementsTitle')}</CardTitle>
              <Link href="/announcements" className="text-sm text-primary hover:underline">
                {t('viewAll')}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('recentAnnouncementsEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {data.recentAnnouncements.map(ann => {
                  const title = isAr ? (ann.titleAr || ann.title) : ann.title
                  const body = isAr ? (ann.bodyAr || ann.body) : ann.body
                  return (
                    <Link
                      key={ann.id}
                      href={`/announcements`}
                      className="block p-2.5 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium truncate">{title}</p>
                        {ann.isPinned && (
                          <Pin className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </div>
                      {body && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 ms-6">{body}</p>
                      )}
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
