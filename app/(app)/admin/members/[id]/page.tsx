import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Phone, Mail, Briefcase, Calendar, Shield } from 'lucide-react'
import { MemberRoleEditor } from '@/components/profile/MemberRoleEditor'
import { getTranslations, getLocale } from 'next-intl/server'
import type { Profile, ProfileMilestone } from '@/types'

const MILESTONE_ICONS: Record<string, string> = {
  baptism: '💧', salvation: '✝️', bible_plan_completed: '📖',
  leadership_training: '🎓', marriage: '💍', other: '⭐',
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { profile: currentUser } = await getCurrentUserWithRole()
  const { id } = await params

  if (!isAdmin(currentUser)) redirect('/')

  const t = await getTranslations('memberDetail')
  const locale = await getLocale()

  const supabase = await createClient()

  const { data: member } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('church_id', currentUser.church_id)
    .single()

  if (!member) notFound()

  const { data: milestones } = await supabase
    .from('profile_milestones')
    .select('*')
    .eq('profile_id', id)
    .order('date', { ascending: false })

  const memberProfile = member as Profile
  const nameAr = `${memberProfile.first_name_ar ?? ''} ${memberProfile.last_name_ar ?? ''}`.trim()
  const nameEn = `${memberProfile.first_name ?? ''} ${memberProfile.last_name ?? ''}`.trim()
  const displayName = nameAr || nameEn || memberProfile.email || '—'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t('statusActive'),
      at_risk: t('statusAtRisk'),
      inactive: t('statusInactive'),
      visitor: t('statusVisitor'),
    }
    return map[status] ?? status
  }

  const getStatusVariant = (status: string) => {
    if (status === 'active') return 'default'
    if (status === 'at_risk') return 'destructive'
    return 'secondary'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/members">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{t('pageTitle')}</h1>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={memberProfile.photo_url ?? undefined} alt={displayName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-start space-y-2">
              {nameAr && <h2 className="text-2xl font-bold">{nameAr}</h2>}
              {nameEn && <p className="text-muted-foreground" dir="ltr">{nameEn}</p>}

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary">{memberProfile.role}</Badge>
                <Badge variant={getStatusVariant(memberProfile.status)}>
                  {getStatusLabel(memberProfile.status)}
                </Badge>
              </div>

              {memberProfile.joined_church_at && (
                <p className="text-sm text-muted-foreground">
                  {t('joinedAt')} {new Date(memberProfile.joined_church_at).toLocaleDateString(locale, { year: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">{t('tabInfo')}</TabsTrigger>
          <TabsTrigger value="milestones">{t('tabMilestones')}</TabsTrigger>
          <TabsTrigger value="admin">{t('tabAdmin')}</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {memberProfile.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span dir="ltr">{memberProfile.phone}</span>
                </div>
              )}
              {memberProfile.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span dir="ltr">{memberProfile.email}</span>
                </div>
              )}
              {(memberProfile.occupation_ar || memberProfile.occupation) && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{memberProfile.occupation_ar ?? memberProfile.occupation}</span>
                </div>
              )}
              {memberProfile.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(memberProfile.date_of_birth).toLocaleDateString(locale)}</span>
                </div>
              )}
              {memberProfile.gender && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{t('infoGender')}</span>
                  <span>{memberProfile.gender === 'male' ? t('infoMale') : t('infoFemale')}</span>
                </div>
              )}

              {!memberProfile.phone && !memberProfile.email && !memberProfile.occupation_ar && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  {t('infoProfileIncomplete')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardContent className="pt-6">
              {milestones && milestones.length > 0 ? (
                <div className="space-y-4">
                  {milestones.map((milestone: ProfileMilestone) => (
                    <div key={milestone.id} className="flex items-start gap-3">
                      <span className="text-2xl">{MILESTONE_ICONS[milestone.type] ?? '⭐'}</span>
                      <div>
                        <p className="font-medium">{milestone.title}</p>
                        {milestone.date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(milestone.date).toLocaleDateString(locale)}
                          </p>
                        )}
                        {milestone.notes && (
                          <p className="text-sm text-muted-foreground">{milestone.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {t('milestonesEmpty')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('adminCardTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Change */}
              <div>
                <p className="text-sm font-medium mb-2">{t('adminChangeRole')}</p>
                <MemberRoleEditor
                  memberId={memberProfile.id}
                  currentRole={memberProfile.role}
                  currentUserRole={currentUser.role}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
