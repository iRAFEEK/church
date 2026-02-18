import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UserCheck, Search } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import type { Profile } from '@/types'

interface SearchParams {
  q?: string
  role?: string
  status?: string
  page?: string
}

const PAGE_SIZE = 25

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { profile } = await getCurrentUserWithRole()
  const params = await searchParams

  if (!isAdmin(profile)) {
    redirect('/')
  }

  const t = await getTranslations('members')
  const locale = await getLocale()

  const supabase = await createClient()

  const page = parseInt(params.page ?? '1') - 1
  const search = params.q?.trim() ?? ''
  const roleFilter = params.role
  const statusFilter = params.status

  // Build query
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (search) {
    query = query.or(
      `first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }
  if (roleFilter) {
    query = query.eq('role', roleFilter)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: members, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const currentPage = page + 1

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    member: { label: t('roleMember'), color: 'secondary' },
    group_leader: { label: t('roleGroupLeader'), color: 'default' },
    ministry_leader: { label: t('roleMinistryLeader'), color: 'default' },
    super_admin: { label: t('roleSuperAdmin'), color: 'default' },
  }

  const STATUS_COLORS: Record<string, string> = {
    active: 'success',
    inactive: 'secondary',
    at_risk: 'warning',
    visitor: 'outline',
  }

  const STATUS_LABELS: Record<string, string> = {
    active: t('statusActive'),
    inactive: t('statusInactive'),
    at_risk: t('statusAtRisk'),
    visitor: t('statusVisitor'),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('pageSubtitle', { count: count ?? 0 })}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={search}
                placeholder={t('searchPlaceholder')}
                className="ps-9"
              />
            </div>

            <select
              name="role"
              defaultValue={roleFilter ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('filterAllRoles')}</option>
              <option value="member">{t('roleMember')}</option>
              <option value="group_leader">{t('roleGroupLeader')}</option>
              <option value="ministry_leader">{t('roleMinistryLeader')}</option>
              <option value="super_admin">{t('roleSuperAdmin')}</option>
            </select>

            <select
              name="status"
              defaultValue={statusFilter ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('filterAllStatuses')}</option>
              <option value="active">{t('statusActive')}</option>
              <option value="inactive">{t('statusInactive')}</option>
              <option value="at_risk">{t('statusAtRisk')}</option>
            </select>

            <Button type="submit" variant="outline">{t('searchButton')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Members Table */}
      {members && members.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-start">
                  <th className="ps-6 py-3 text-sm font-medium text-muted-foreground">{t('tableMember')}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tableRole')}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tableStatus')}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tablePhone')}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tableJoinedAt')}</th>
                  <th className="pe-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((member: Profile) => {
                  const nameAr = `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`.trim()
                  const nameEn = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
                  const displayName = nameAr || nameEn || member.email || '—'
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="ps-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={member.photo_url ?? undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate" dir="ltr">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[member.role]?.label ?? member.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={STATUS_COLORS[member.status] as 'default' | 'secondary' | 'destructive' | 'outline' ?? 'default'}
                          className="text-xs"
                        >
                          {STATUS_LABELS[member.status] ?? member.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                        {member.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {member.joined_church_at
                          ? new Date(member.joined_church_at).toLocaleDateString(locale)
                          : '—'}
                      </td>
                      <td className="pe-6 py-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/members/${member.id}`}>{t('tableViewButton')}</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {t('paginationPage', { current: currentPage, total: totalPages })}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?q=${search}&page=${currentPage - 1}`}>{t('paginationPrevious')}</Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?q=${search}&page=${currentPage + 1}`}>{t('paginationNext')}</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground text-sm">
              {search ? t('emptyNoResults') : t('emptyNone')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
