import Link from 'next/link'
import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pencil, Phone, Mail, Briefcase, Calendar, Star, Users, UserPlus, Heart, Music, Megaphone, Shield, ChevronRight, ChevronLeft } from 'lucide-react'
import { AttendanceHistory } from '@/components/profile/AttendanceHistory'
import { MemberInvolvementCard } from '@/components/profile/MemberInvolvementCard'
import { getTranslations, getLocale } from 'next-intl/server'

const MILESTONE_ICONS: Record<string, string> = {
  baptism: '\u{1F4A7}',
  salvation: '\u271D\uFE0F',
  bible_plan_completed: '\u{1F4D6}',
  leadership_training: '\u{1F393}',
  marriage: '\u{1F48D}',
  other: '\u2B50',
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  at_risk: 'warning',
  visitor: 'outline' as never,
}

export default async function ProfilePage() {
  const { profile } = await getCurrentUserWithRole()
  const supabase = await createClient()
  const t = await getTranslations('profile')
  const locale = await getLocale()

  // Run all queries in parallel — milestones, attendance, and admin counts together
  const isAdmin = profile.role === 'super_admin'

  const [milestonesRes, attendanceRes, ...adminResults] = await Promise.all([
    supabase
      .from('profile_milestones')
      .select('id, type, title, date, notes')
      .eq('profile_id', profile.id)
      .order('date', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, status, marked_at, gathering:gathering_id(id, scheduled_at, topic, group:group_id(id, name, name_ar))')
      .eq('profile_id', profile.id)
      .order('marked_at', { ascending: false })
      .limit(40),
    ...(isAdmin ? [
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id),
      supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('status', 'new'),
      supabase.from('groups').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('is_active', true),
      supabase.from('ministries').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('is_active', true),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id),
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('is_active', true),
      supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('status', 'published'),
      supabase.from('serving_areas').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('is_active', true),
    ] : []),
  ])

  const milestones = milestonesRes.data
  const attendanceRecords = attendanceRes.data

  let adminCounts: { members: number; visitors: number; groups: number; ministries: number; events: number; songs: number; announcements: number; serving: number } | null = null
  if (isAdmin && adminResults.length === 8) {
    const [members, visitors, groups, ministries, events, songs, announcements, serving] = adminResults
    adminCounts = {
      members: members.count ?? 0,
      visitors: visitors.count ?? 0,
      groups: groups.count ?? 0,
      ministries: ministries.count ?? 0,
      events: events.count ?? 0,
      songs: songs.count ?? 0,
      announcements: announcements.count ?? 0,
      serving: serving.count ?? 0,
    }
  }

  const MILESTONE_LABELS: Record<string, string> = {
    baptism: t('milestoneBaptism'),
    salvation: t('milestoneSalvation'),
    bible_plan_completed: t('milestoneBiblePlan'),
    leadership_training: t('milestoneLeadership'),
    marriage: t('milestoneMarriage'),
    other: t('milestoneOther'),
  }

  const ROLE_LABELS: Record<string, string> = {
    member: t('roleMember'),
    group_leader: t('roleGroupLeader'),
    ministry_leader: t('roleMinistryLeader'),
    super_admin: t('roleSuperAdmin'),
  }

  const STATUS_LABELS: Record<string, string> = {
    active: t('statusActive'),
    inactive: t('statusInactive'),
    at_risk: t('statusAtRisk'),
    visitor: t('statusVisitor'),
  }

  const displayNameAr = `${profile.first_name_ar ?? ''} ${profile.last_name_ar ?? ''}`.trim()
  const displayNameEn = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  const displayName = locale === 'ar' ? (displayNameAr || displayNameEn) : (displayNameEn || displayNameAr)
  const initials = (displayNameAr || displayNameEn).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.photo_url ?? undefined} alt={displayName} />
                <AvatarFallback className="text-2xl">{initials || '?'}</AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-start space-y-2">
              <div>
                {displayNameAr && (
                  <h1 className="text-2xl font-bold">{displayNameAr}</h1>
                )}
                {displayNameEn && (
                  <p className="text-muted-foreground" dir="ltr">{displayNameEn}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
                <Badge variant={(STATUS_VARIANTS[profile.status] as 'default' | 'secondary' | 'destructive' | 'outline') ?? 'default'}>
                  {STATUS_LABELS[profile.status] ?? profile.status}
                </Badge>
              </div>

              {profile.joined_church_at && (
                <p className="text-sm text-muted-foreground">
                  {t('joinedAt')} {new Date(profile.joined_church_at).toLocaleDateString(locale, { year: 'numeric', month: 'long' })}
                </p>
              )}
            </div>

            {/* Edit Button */}
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/edit">
                <Pencil className="h-4 w-4" />
                {t('editButton')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Quick Links */}
      {adminCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('qlMembers'), count: adminCounts.members, href: '/admin/members', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: t('qlVisitors'), count: adminCounts.visitors, href: '/admin/visitors', icon: UserPlus, color: 'text-green-600 bg-green-50' },
            { label: t('qlMinistries'), count: adminCounts.ministries, href: '/admin/ministries', icon: Shield, color: 'text-amber-600 bg-amber-50' },
            { label: t('qlGroups'), count: adminCounts.groups, href: '/admin/groups', icon: Heart, color: 'text-purple-600 bg-purple-50' },
            { label: t('qlEvents'), count: adminCounts.events, href: '/events', icon: Calendar, color: 'text-rose-600 bg-rose-50' },
            { label: t('qlSongs'), count: adminCounts.songs, href: '/admin/songs', icon: Music, color: 'text-indigo-600 bg-indigo-50' },
            { label: t('qlAnnouncements'), count: adminCounts.announcements, href: '/admin/announcements', icon: Megaphone, color: 'text-orange-600 bg-orange-50' },
            { label: t('qlServing'), count: adminCounts.serving, href: '/serving', icon: Heart, color: 'text-teal-600 bg-teal-50' },
          ].map((item) => {
            const Icon = item.icon
            const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight
            return (
              <Link key={item.href} href={item.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold leading-none">{item.count}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.label}</p>
                    </div>
                    <Chevron className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">{t('tabInfo')}</TabsTrigger>
          <TabsTrigger value="involvement">{t('tabInvolvement')}</TabsTrigger>
          <TabsTrigger value="milestones">{t('tabMilestones')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('tabAttendance')}</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('infoTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span dir="ltr">{profile.phone}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span dir="ltr">{profile.email}</span>
                </div>
              )}
              {(profile.occupation_ar || profile.occupation) && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{profile.occupation_ar ?? profile.occupation}</span>
                </div>
              )}
              {profile.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{new Date(profile.date_of_birth).toLocaleDateString(locale)}</span>
                </div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">{t('infoGender')}</span>
                  <span>{profile.gender === 'male' ? t('infoMale') : t('infoFemale')}</span>
                </div>
              )}

              {!profile.phone && !profile.occupation_ar && !profile.date_of_birth && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{t('infoEmpty')}</p>
                  <Button variant="link" size="sm" asChild className="mt-2">
                    <Link href="/profile/edit">{t('infoCompleteProfile')}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Involvement Tab */}
        <TabsContent value="involvement">
          <Card>
            <CardContent className="pt-6">
              <MemberInvolvementCard profileId={profile.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('milestonesTitle')}</CardTitle>
              {/* AddMilestone button — rendered client-side via component */}
            </CardHeader>
            <CardContent>
              {milestones && milestones.length > 0 ? (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-3">
                      <span className="text-2xl">{MILESTONE_ICONS[milestone.type] ?? '\u2B50'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{milestone.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {MILESTONE_LABELS[milestone.type] ?? milestone.type}
                        </p>
                        {milestone.date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(milestone.date).toLocaleDateString(locale)}
                          </p>
                        )}
                        {milestone.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{milestone.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('milestonesEmpty')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('attendanceTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceHistory records={(attendanceRecords || []) as unknown as Parameters<typeof AttendanceHistory>[0]['records']} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
