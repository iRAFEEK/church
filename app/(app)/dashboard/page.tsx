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

  const churchId = profile.church_id
  const slaHours = church.visitor_sla_hours ?? 48

  if (profile.role === 'super_admin') {
    const data = await getCachedAdminDashboard(churchId, id, slaHours)
    return (
      <div className="space-y-6">
        {header}
        <AdminDashboard data={data} />
      </div>
    )
  }

  if (profile.role === 'ministry_leader') {
    const data = await getCachedMinistryLeaderDashboard(churchId, id)
    return (
      <div className="space-y-6">
        {header}
        <MinistryLeaderDashboard data={data} />
      </div>
    )
  }

  if (isLeader(profile)) {
    const data = await getCachedLeaderDashboard(churchId, id)
    return (
      <div className="space-y-6">
        {header}
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
        <LeaderDashboard data={data} />
      </div>
    )
  }

  // Member dashboard
  const data = await getCachedMemberDashboard(churchId, id)
  return (
    <div className="space-y-6">
      {header}
      <MemberDashboard data={data} />
    </div>
  )
}
