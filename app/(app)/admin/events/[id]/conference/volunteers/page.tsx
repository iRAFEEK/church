import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  area?: string
  team?: string
  status?: string
  search?: string
  page?: string
}

const PAGE_SIZE = 25

const CHECKIN_COLORS: Record<string, string> = {
  not_arrived: 'bg-zinc-100 text-zinc-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-blue-100 text-blue-700',
  no_show: 'bg-red-100 text-red-700',
}

export default async function VolunteersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const t = await getTranslations('conference')
  const locale = await getLocale()
  const isRTL = locale.startsWith('ar')
  const supabase = await createClient()

  const page = parseInt(sp.page || '1')
  const offset = (page - 1) * PAGE_SIZE

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  // Fetch areas and teams for filter options
  const [{ data: areas }, { data: teams }] = await Promise.all([
    supabase
      .from('conference_areas')
      .select('id, name, name_ar')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(100),
    supabase
      .from('conference_teams')
      .select('id, name, name_ar, area_id')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(200),
  ])

  // Build members query
  let membersQuery = supabase
    .from('conference_team_members')
    .select(
      'id, team_id, role, checkin_status, shift_start, shift_end, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, phone)',
      { count: 'exact' }
    )
    .eq('event_id', id)
    .eq('church_id', user.profile.church_id)
    .order('checkin_status')
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.team) membersQuery = membersQuery.eq('team_id', sp.team)
  if (sp.status) membersQuery = membersQuery.eq('checkin_status', sp.status)

  const { data: rawMembers, count } = await membersQuery

  // Supabase returns FK joins as arrays without the Database generic; normalize.
  type MemberProfile = { first_name: string; last_name: string; first_name_ar?: string | null; last_name_ar?: string | null }
  type NormalizedMember = Omit<NonNullable<typeof rawMembers>[0], 'profile'> & { profile: MemberProfile | null }
  const members: NormalizedMember[] = (rawMembers || []).map((m) => ({
    ...m,
    profile: Array.isArray(m.profile) ? (m.profile[0] || null) : m.profile,
  })) as unknown as NormalizedMember[]

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  const getProfileName = (profile: MemberProfile | null) => {
    if (!profile) return '—'
    if (isRTL && (profile.first_name_ar || profile.last_name_ar)) {
      return `${profile.first_name_ar || ''} ${profile.last_name_ar || ''}`.trim()
    }
    return `${profile.first_name} ${profile.last_name}`.trim()
  }

  const teamMap = new Map((teams || []).map((t) => [t.id, t]))

  const getTeamName = (teamId: string) => {
    const team = teamMap.get(teamId)
    if (!team) return '—'
    return isRTL ? (team.name_ar || team.name) : team.name
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('volunteers')}</h2>
        <span className="text-sm text-muted-foreground" dir="ltr">{count ?? 0}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`?`}>
          <Badge
            variant={!sp.team && !sp.status ? 'default' : 'outline'}
            className="cursor-pointer h-9 px-3 text-sm"
          >
            {t('allAreasLabel')}
          </Badge>
        </Link>
        {(teams || []).map((team) => (
          <Link key={team.id} href={`?team=${team.id}`}>
            <Badge
              variant={sp.team === team.id ? 'default' : 'outline'}
              className="cursor-pointer h-9 px-3 text-sm"
            >
              {isRTL ? (team.name_ar || team.name) : team.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['not_arrived', 'checked_in', 'checked_out', 'no_show'] as const).map((s) => (
          <Link key={s} href={`?${new URLSearchParams({ ...(sp.team ? { team: sp.team } : {}), status: s })}`}>
            <Badge
              variant={sp.status === s ? 'default' : 'outline'}
              className={`cursor-pointer h-9 px-3 text-sm ${sp.status === s ? '' : CHECKIN_COLORS[s]}`}
            >
              {t(s === 'not_arrived' ? 'notArrived' : s === 'checked_in' ? 'checkedIn' : s === 'checked_out' ? 'checkedOut' : 'noShow')}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {(!members || members.length === 0) && (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">{t('emptyVolunteers')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('emptyVolunteersDesc')}</p>
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      {members && members.length > 0 && (
        <>
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? 'الاسم' : 'Name'}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('team')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('role')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('shiftTime')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('checkIn')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">{getProfileName(member.profile)}</td>
                    <td className="px-4 py-3">{getTeamName(member.team_id)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{t(member.role as Parameters<typeof t>[0])}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs" dir="ltr">
                      {member.shift_start ? new Date(member.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${CHECKIN_COLORS[member.checkin_status] || ''}`}>
                        {t(member.checkin_status === 'not_arrived' ? 'notArrived' : member.checkin_status === 'checked_in' ? 'checkedIn' : member.checkin_status === 'checked_out' ? 'checkedOut' : 'noShow')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{getProfileName(member.profile)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{getTeamName(member.team_id)}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${CHECKIN_COLORS[member.checkin_status] || ''}`}>
                    {t(member.checkin_status === 'not_arrived' ? 'notArrived' : member.checkin_status === 'checked_in' ? 'checkedIn' : member.checkin_status === 'checked_out' ? 'checkedOut' : 'noShow')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}>←</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground self-center" dir="ltr">{page} / {totalPages}</span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}>→</Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
