import { getCurrentUserWithRole, isAdmin, isLeader } from '@/lib/auth'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { fetchAdminDashboard, fetchLeaderDashboard, fetchMemberDashboard } from '@/lib/dashboard/queries'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
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
  const supabase = await createClient()

  const isRTL = locale === 'ar'
  const firstName = isRTL
    ? (profile.first_name_ar || profile.first_name || t('fallbackUser'))
    : (profile.first_name || profile.first_name_ar || t('fallbackUser'))

  const churchName = isRTL
    ? (church.name_ar ?? church.name)
    : (church.name ?? church.name_ar)

  const roleKey = ROLE_KEYS[profile.role] ?? 'roleMember'

  // Welcome header (shared across all roles)
  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('welcome', { name: firstName })}
        </h1>
        <p className="text-muted-foreground">{churchName}</p>
      </div>
      <Badge variant="secondary" className="text-sm">
        {t(roleKey)}
      </Badge>
    </div>
  )

  if (isAdmin(profile)) {
    const data = await fetchAdminDashboard(supabase, id, profile.church_id, church.visitor_sla_hours ?? 48)
    return (
      <div className="space-y-6">
        {header}
        <AdminDashboard data={data} />
      </div>
    )
  }

  if (isLeader(profile)) {
    const data = await fetchLeaderDashboard(supabase, id, profile.church_id)
    return (
      <div className="space-y-6">
        {header}
        <LeaderDashboard data={data} />
      </div>
    )
  }

  // Member dashboard
  const data = await fetchMemberDashboard(supabase, id, profile.church_id)
  return (
    <div className="space-y-6">
      {header}
      <MemberDashboard data={data} />
    </div>
  )
}
