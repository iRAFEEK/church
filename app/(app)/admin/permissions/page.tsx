import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Shield, User, Users, UserCheck, Pencil } from 'lucide-react'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { PermissionKey } from '@/types'

const ROLE_META: Record<string, { icon: typeof User; en: string; ar: string }> = {
  member: { icon: User, en: 'Members', ar: 'الأعضاء' },
  group_leader: { icon: Users, en: 'Group Leaders', ar: 'قادة المجموعات' },
  ministry_leader: { icon: UserCheck, en: 'Ministry Leaders', ar: 'قادة الخدمات' },
  super_admin: { icon: Shield, en: 'Super Admins', ar: 'المسؤولون' },
}

export default async function PermissionsSummaryPage() {
  await requireRole('super_admin')
  const t = await getTranslations('permissions')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user!.id)
    .single()

  // Fetch all profiles with custom overrides
  const { data: membersWithOverrides } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, role, permissions')
    .eq('church_id', currentProfile!.church_id)
    .not('permissions', 'is', null)
    .order('role')

  // Group by role
  const groupedByRole: Record<string, typeof membersWithOverrides> = {}
  for (const m of membersWithOverrides || []) {
    if (!groupedByRole[m.role]) groupedByRole[m.role] = []
    groupedByRole[m.role]!.push(m)
  }

  const roles = ['member', 'group_leader', 'ministry_leader', 'super_admin']

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('summaryTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('summarySubtitle')}</p>
      </div>

      {roles.map(role => {
        const meta = ROLE_META[role]
        if (!meta) return null
        const Icon = meta.icon
        const roleLabel = isRTL ? meta.ar : meta.en
        const members = groupedByRole[role] || []

        return (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {roleLabel}
                {members.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {members.length} {isRTL ? 'تخصيص' : 'overrides'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  {t('noOverrides')}
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((m: any) => {
                    const nameAr = `${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.trim()
                    const nameEn = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()
                    const name = isRTL ? (nameAr || nameEn) : (nameEn || nameAr)
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    const overrides = m.permissions as Record<string, boolean> | null
                    const overrideKeys = overrides ? Object.keys(overrides) : []

                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name || '—'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {overrideKeys.map(key => (
                              <Badge
                                key={key}
                                variant={overrides![key] ? 'default' : 'destructive'}
                                className="text-[9px]"
                              >
                                {isRTL
                                  ? PERMISSION_LABELS[key as PermissionKey]?.ar
                                  : PERMISSION_LABELS[key as PermissionKey]?.en}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Link href={`/admin/members/${m.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
