import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { MembersSearchInput } from './MembersSearchInput'
import { AddMemberDialog } from '@/components/members/AddMemberDialog'
import { canViewMemberPhone, type MemberDirectoryVisibility } from '@/lib/members/visibility'

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
  const { profile, church, resolvedPermissions } = await requirePermission('can_view_members')
  const isSuperAdmin = profile.role === 'super_admin'
  // Only approvers (super_admin / ministry_leader) can add members (Track A3).
  const canManageMembers = profile.role === 'super_admin' || profile.role === 'ministry_leader'
  // Per-church member-directory privacy (migration 081): gate phone display.
  const directoryVisibility = (church?.member_directory_visibility ?? 'leaders_only') as MemberDirectoryVisibility
  const canSeePhone = canViewMemberPhone(directoryVisibility, profile.role, resolvedPermissions.can_view_member_phone)
  const params = await searchParams

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
    .select('id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, photo_url, role, status, joined_church_at', { count: 'exact' })
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

  // Membership status for the current church (Track A3) — surfaces a "pending claim"
  // badge for leader-added members who haven't claimed via OTP yet ('managed').
  const memberIds = (members ?? []).map((m) => m.id)
  const membershipStatus = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: memberships } = await supabase
      .from('user_churches')
      .select('user_id, status')
      .eq('church_id', profile.church_id)
      .in('user_id', memberIds)
    for (const m of memberships ?? []) {
      membershipStatus.set(m.user_id, m.status)
    }
  }

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
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('pageSubtitle', { count: count ?? 0 })}</p>
        </div>
        {canManageMembers && (
          <AddMemberDialog churchId={profile.church_id} role={profile.role} locale={locale} />
        )}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <MembersSearchInput defaultValue={search} />

            <select
              name="role"
              defaultValue={roleFilter ?? ''}
              className="w-full sm:w-auto h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="w-full sm:w-auto h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('filterAllStatuses')}</option>
              <option value="active">{t('statusActive')}</option>
              <option value="inactive">{t('statusInactive')}</option>
              <option value="at_risk">{t('statusAtRisk')}</option>
            </select>

            <Button type="submit" variant="outline" className="w-full sm:w-auto">{t('searchButton')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      {members && members.length > 0 ? (
        <Card>
          {/* Mobile card list — hidden on md+ */}
          <div className="md:hidden divide-y">
            {members.map((member) => {
              const nameAr = `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`.trim()
              const nameEn = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
              const displayName = nameAr || nameEn || member.email || '—'
              const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

              const isUnclaimed = membershipStatus.get(member.id) === 'managed'

              const cardContent = (
                <div className="flex items-center gap-3 px-4 py-3 active:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={member.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate" dir="ltr">{member.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isUnclaimed ? (
                      <Badge variant="outline" className="text-xs">{t('badgeUnclaimed')}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[member.role]?.label ?? member.role}
                      </Badge>
                    )}
                    <Badge
                      variant={STATUS_COLORS[member.status] as 'default' | 'secondary' | 'destructive' | 'outline' ?? 'default'}
                      className="text-xs"
                    >
                      {STATUS_LABELS[member.status] ?? member.status}
                    </Badge>
                  </div>
                </div>
              )

              return isSuperAdmin ? (
                <Link key={member.id} href={`/admin/permissions/${member.id}`} className="block hover:bg-muted/30">
                  {cardContent}
                </Link>
              ) : (
                <Link key={member.id} href={`/admin/members/${member.id}`} className="block hover:bg-muted/30">
                  {cardContent}
                </Link>
              )
            })}
          </div>

          {/* Desktop table — hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-start">
                  <th scope="col" className="ps-6 py-3 text-sm font-medium text-muted-foreground">{t('tableMember')}</th>
                  <th scope="col" className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tableRole')}</th>
                  <th scope="col" className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tableStatus')}</th>
                  {canSeePhone && (
                    <th scope="col" className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tablePhone')}</th>
                  )}
                  <th scope="col" className="px-4 py-3 text-sm font-medium text-muted-foreground">{t('tableJoinedAt')}</th>
                  <th scope="col" className="pe-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((member) => {
                  const nameAr = `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`.trim()
                  const nameEn = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
                  const displayName = nameAr || nameEn || member.email || '—'
                  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="ps-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={member.photo_url ?? undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            {isSuperAdmin ? (
                              <Link href={`/admin/permissions/${member.id}`} className="font-medium text-sm truncate block hover:underline">
                                {displayName}
                              </Link>
                            ) : (
                              <p className="font-medium text-sm truncate">{displayName}</p>
                            )}
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={STATUS_COLORS[member.status] as 'default' | 'secondary' | 'destructive' | 'outline' ?? 'default'}
                            className="text-xs"
                          >
                            {STATUS_LABELS[member.status] ?? member.status}
                          </Badge>
                          {membershipStatus.get(member.id) === 'managed' && (
                            <Badge variant="outline" className="text-xs">{t('badgeUnclaimed')}</Badge>
                          )}
                        </div>
                      </td>
                      {canSeePhone && (
                        <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                          {member.phone ?? '—'}
                        </td>
                      )}
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
