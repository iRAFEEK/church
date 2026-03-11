import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Shield, User, Users, UserCheck, ShieldCheck, Search, Settings, Pencil } from 'lucide-react'
import { ALL_PERMISSIONS, PERMISSION_LABELS, HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'
import type { PermissionKey } from '@/types'

const ROLE_META: Record<string, { icon: typeof User; en: string; ar: string }> = {
  member: { icon: User, en: 'Members', ar: 'الأعضاء' },
  group_leader: { icon: Users, en: 'Group Leaders', ar: 'قادة المجموعات' },
  ministry_leader: { icon: UserCheck, en: 'Ministry Leaders', ar: 'قادة الخدمات' },
}

interface SearchParams {
  q?: string
  role?: string
}

export default async function PermissionsSummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireRole('super_admin')
  const t = await getTranslations('permissions')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user!.id)
    .single()

  const churchId = currentProfile!.church_id
  const search = params.q?.trim() ?? ''
  const roleFilter = params.role

  // Fetch all members (excluding super_admin — they always have full perms)
  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, role, permissions')
    .eq('church_id', churchId)
    .neq('role', 'super_admin')
    .order('role')
    .order('first_name')
    .limit(200)

  if (search) {
    query = query.or(
      `first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }
  if (roleFilter) {
    query = query.eq('role', roleFilter)
  }

  const { data: members } = await query

  // Count overrides per role
  const overrideCounts: Record<string, number> = {}
  for (const m of members || []) {
    if (m.permissions && Object.keys(m.permissions as object).length > 0) {
      overrideCounts[m.role] = (overrideCounts[m.role] || 0) + 1
    }
  }

  const configuredRoles = ['member', 'group_leader', 'ministry_leader']

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('summaryTitle')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t('summarySubtitle')}</p>
      </div>

      {/* Role Defaults Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {configuredRoles.map(role => {
          const meta = ROLE_META[role]
          if (!meta) return null
          const Icon = meta.icon
          const roleLabel = isRTL ? meta.ar : meta.en
          const defaults = HARDCODED_ROLE_DEFAULTS[role as keyof typeof HARDCODED_ROLE_DEFAULTS]
          const enabledCount = ALL_PERMISSIONS.filter(k => defaults[k]).length

          return (
            <Card key={role} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{roleLabel}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {enabledCount}/{ALL_PERMISSIONS.length}
                  </Badge>
                </div>
                {overrideCounts[role] && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    {overrideCounts[role]} {isRTL ? 'عضو لديه تخصيصات' : 'with custom overrides'}
                  </p>
                )}
                <Link href="/admin/settings/roles" className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Settings className="h-3 w-3 me-1" />
                    {isRTL ? 'تعديل الافتراضيات' : 'Edit Defaults'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={search}
                placeholder={isRTL ? 'البحث عن عضو...' : 'Search members...'}
                className="ps-9"
              />
            </div>
            <select
              name="role"
              defaultValue={roleFilter ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{isRTL ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="member">{isRTL ? 'أعضاء' : 'Members'}</option>
              <option value="group_leader">{isRTL ? 'قادة المجموعات' : 'Group Leaders'}</option>
              <option value="ministry_leader">{isRTL ? 'قادة الخدمات' : 'Ministry Leaders'}</option>
            </select>
            <Button type="submit" variant="outline">{isRTL ? 'بحث' : 'Search'}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      {members && members.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isRTL ? 'صلاحيات الأعضاء' : 'Member Permissions'}
              <Badge variant="secondary" className="ms-2 text-[10px]">{members.length}</Badge>
            </CardTitle>
          </CardHeader>
          {/* Mobile card list */}
          <div className="md:hidden divide-y">
            {members.map((m: any) => {
              const nameAr = `${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.trim()
              const nameEn = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()
              const name = isRTL ? (nameAr || nameEn) : (nameEn || nameAr)
              const initials = name ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'
              const overrides = m.permissions as Record<string, boolean> | null
              const overrideKeys = overrides ? Object.keys(overrides) : []
              const meta = ROLE_META[m.role]
              const roleLabel = meta ? (isRTL ? meta.ar : meta.en) : m.role
              return (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={m.photo_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{name || m.email || '—'}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{roleLabel}</Badge>
                    </div>
                    {overrideKeys.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {overrideKeys.slice(0, 2).map(key => (
                          <Badge key={key} variant="outline" className={`text-[9px] ${overrides![key] ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {isRTL ? PERMISSION_LABELS[key as PermissionKey]?.ar : PERMISSION_LABELS[key as PermissionKey]?.en}
                          </Badge>
                        ))}
                        {overrideKeys.length > 2 && <Badge variant="outline" className="text-[9px]">+{overrideKeys.length - 2}</Badge>}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">{isRTL ? 'افتراضي' : 'Default'}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild className="shrink-0">
                    <Link href={`/admin/permissions/${m.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-start">
                  <th className="ps-6 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? 'العضو' : 'Member'}</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? 'الدور' : 'Role'}</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{isRTL ? 'التخصيصات' : 'Overrides'}</th>
                  <th className="pe-6 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m: any) => {
                  const nameAr = `${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.trim()
                  const nameEn = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()
                  const name = isRTL ? (nameAr || nameEn) : (nameEn || nameAr)
                  const initials = name ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'
                  const overrides = m.permissions as Record<string, boolean> | null
                  const overrideKeys = overrides ? Object.keys(overrides) : []
                  const meta = ROLE_META[m.role]
                  const roleLabel = meta ? (isRTL ? meta.ar : meta.en) : m.role

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="ps-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={m.photo_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name || m.email || '—'}</p>
                            {m.email && name && (
                              <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{m.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {overrideKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {overrideKeys.slice(0, 3).map(key => (
                              <Badge
                                key={key}
                                variant="outline"
                                className={`text-[9px] ${overrides![key] ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                              >
                                {isRTL
                                  ? PERMISSION_LABELS[key as PermissionKey]?.ar
                                  : PERMISSION_LABELS[key as PermissionKey]?.en}
                              </Badge>
                            ))}
                            {overrideKeys.length > 3 && (
                              <Badge variant="outline" className="text-[9px]">
                                +{overrideKeys.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{isRTL ? 'افتراضي' : 'Default'}</span>
                        )}
                      </td>
                      <td className="pe-6 py-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/permissions/${m.id}`}>
                            <Pencil className="h-3.5 w-3.5 me-1" />
                            {isRTL ? 'تعديل' : 'Edit'}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {search ? (isRTL ? 'لا نتائج' : 'No results found') : (isRTL ? 'لا يوجد أعضاء' : 'No members found')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
