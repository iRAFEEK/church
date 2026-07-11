import Link from 'next/link'
import { Clock, GraduationCap, Settings } from 'lucide-react'
import { getCurrentUserWithRole, isLeader } from '@/lib/auth'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  getCachedAdminDashboard,
  getCachedMinistryLeaderDashboard,
  getCachedLeaderDashboard,
  getCachedMemberDashboard,
} from '@/lib/dashboard/queries'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { MinistryLeaderDashboard } from '@/components/dashboard/MinistryLeaderDashboard'
import { LeaderDashboard } from '@/components/dashboard/LeaderDashboard'
import { MemberDashboard } from '@/components/dashboard/MemberDashboard'
import { PendingInvitations } from '@/components/churches/PendingInvitations'

const ROLE_KEYS: Record<string, string> = {
  member: 'roleMember',
  group_leader: 'roleGroupLeader',
  ministry_leader: 'roleMinistryLeader',
  super_admin: 'roleSuperAdmin',
}

export default async function DashboardPage() {
  const { id, profile, church } = await getCurrentUserWithRole()
  const t = await getTranslations('dashboard')
  const locale = await getLocale()

  const isRTL = locale.startsWith('ar')
  const firstName = isRTL
    ? (profile.first_name_ar || profile.first_name || t('fallbackUser'))
    : (profile.first_name || profile.first_name_ar || t('fallbackUser'))

  const churchName = isRTL
    ? (church.name_ar ?? church.name)
    : (church.name ?? church.name_ar)

  const roleKey = ROLE_KEYS[profile.role] ?? 'roleMember'

  // Welcome header (shared across all roles)
  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">
          {t('welcome', { name: firstName })}
        </h1>
        <p className="text-muted-foreground truncate">{churchName}</p>
      </div>
      <Badge variant="secondary" className="text-sm shrink-0">
        {t(roleKey)}
      </Badge>
    </div>
  )

  // Cross-church invitations surface (renders nothing when there are none).
  const invitationsBanner = <PendingInvitations />

  const churchId = profile.church_id
  const slaHours = church.visitor_sla_hours ?? 48

  // Pending church: the founder is waiting for platform approval. Show an "under review"
  // home linking to the only two things they can do — watch tutorials + edit church info.
  if (church.status && church.status !== 'active') {
    const tp = await getTranslations('pendingHome')
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-7 w-7 text-amber-700" />
          </div>
          <h2 className="text-lg font-bold text-amber-900">{tp('title')}</h2>
          <p className="text-sm text-amber-800 mt-2 max-w-md mx-auto leading-relaxed">{tp('body')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/help" className="rounded-xl border border-zinc-200 bg-white p-4 hover:bg-muted/50 transition-colors">
            <GraduationCap className="h-6 w-6 text-primary mb-2" />
            <p className="font-semibold text-zinc-900">{tp('tutorialsTitle')}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{tp('tutorialsBody')}</p>
          </Link>
          {profile.role === 'super_admin' && (
            <Link href="/admin/settings" className="rounded-xl border border-zinc-200 bg-white p-4 hover:bg-muted/50 transition-colors">
              <Settings className="h-6 w-6 text-primary mb-2" />
              <p className="font-semibold text-zinc-900">{tp('churchInfoTitle')}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{tp('churchInfoBody')}</p>
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (profile.role === 'super_admin') {
    const data = await getCachedAdminDashboard(churchId, id, slaHours)
    return (
      <div className="space-y-6">
        {header}
        {invitationsBanner}
        <AdminDashboard data={data} />
      </div>
    )
  }

  if (profile.role === 'ministry_leader') {
    const data = await getCachedMinistryLeaderDashboard(churchId, id)
    return (
      <div className="space-y-6">
        {header}
        {invitationsBanner}
        <MinistryLeaderDashboard data={data} />
      </div>
    )
  }

  if (isLeader(profile)) {
    const data = await getCachedLeaderDashboard(churchId, id)
    return (
      <div className="space-y-6">
        {header}
        {invitationsBanner}
        <LeaderDashboard data={data} />
      </div>
    )
  }

  // Check if member is a ministry co-leader — show LeaderDashboard if so
  const supabase = await createClient()
  const { data: coLeaderCheck } = await supabase
    .from('ministry_members')
    .select('id')
    .eq('profile_id', id)
    .eq('is_active', true)
    .eq('role_in_ministry', 'co_leader')
    .limit(1)

  if (coLeaderCheck && coLeaderCheck.length > 0) {
    const data = await getCachedLeaderDashboard(churchId, id)
    return (
      <div className="space-y-6">
        {header}
        {invitationsBanner}
        <LeaderDashboard data={data} />
      </div>
    )
  }

  // Member dashboard
  const data = await getCachedMemberDashboard(churchId, id)
  return (
    <div className="space-y-6">
      {header}
      {invitationsBanner}
      <MemberDashboard data={data} />
    </div>
  )
}
