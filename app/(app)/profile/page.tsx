import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pencil, Phone, Mail, MapPin, Briefcase, Calendar, Star } from 'lucide-react'
import type { ProfileMilestone } from '@/types'

const MILESTONE_ICONS: Record<string, string> = {
  baptism: '💧',
  salvation: '✝️',
  bible_plan_completed: '📖',
  leadership_training: '🎓',
  marriage: '💍',
  other: '⭐',
}

const MILESTONE_LABELS: Record<string, string> = {
  baptism: 'معمودية',
  salvation: 'خلاص',
  bible_plan_completed: 'قراءة الكتاب المقدس',
  leadership_training: 'تدريب قيادي',
  marriage: 'زواج',
  other: 'أخرى',
}

const ROLE_LABELS: Record<string, string> = {
  member: 'عضو',
  group_leader: 'قائد مجموعة',
  ministry_leader: 'قائد خدمة',
  super_admin: 'مشرف',
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

  const { data: milestones } = await supabase
    .from('profile_milestones')
    .select('*')
    .eq('profile_id', profile.id)
    .order('date', { ascending: false })

  const displayNameAr = `${profile.first_name_ar ?? ''} ${profile.last_name_ar ?? ''}`.trim()
  const displayNameEn = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
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
                <AvatarImage src={profile.photo_url ?? undefined} alt={displayNameAr} />
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
                  {profile.status === 'active' ? 'نشط' :
                   profile.status === 'inactive' ? 'غير نشط' :
                   profile.status === 'at_risk' ? 'يحتاج متابعة' : 'زائر'}
                </Badge>
              </div>

              {profile.joined_church_at && (
                <p className="text-sm text-muted-foreground">
                  انضم {new Date(profile.joined_church_at).toLocaleDateString('ar', { year: 'numeric', month: 'long' })}
                </p>
              )}
            </div>

            {/* Edit Button */}
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/edit">
                <Pencil className="h-4 w-4" />
                تعديل
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">المعلومات الشخصية</TabsTrigger>
          <TabsTrigger value="milestones">المراحل الروحية</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">المعلومات الشخصية</CardTitle>
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
                  <span>{new Date(profile.date_of_birth).toLocaleDateString('ar')}</span>
                </div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">الجنس:</span>
                  <span>{profile.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
              )}

              {!profile.phone && !profile.occupation_ar && !profile.date_of_birth && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">لا توجد معلومات إضافية</p>
                  <Button variant="link" size="sm" asChild className="mt-2">
                    <Link href="/profile/edit">أكمل ملفك الشخصي</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">المراحل الروحية</CardTitle>
              {/* AddMilestone button — rendered client-side via component */}
            </CardHeader>
            <CardContent>
              {milestones && milestones.length > 0 ? (
                <div className="space-y-4">
                  {milestones.map((milestone: ProfileMilestone) => (
                    <div key={milestone.id} className="flex items-start gap-3">
                      <span className="text-2xl">{MILESTONE_ICONS[milestone.type] ?? '⭐'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{milestone.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {MILESTONE_LABELS[milestone.type] ?? milestone.type}
                        </p>
                        {milestone.date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(milestone.date).toLocaleDateString('ar')}
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
                  <p className="text-sm">لا توجد مراحل روحية مسجلة بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
