import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations, getLocale } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Calendar, Heart } from 'lucide-react'

const ROLE_KEYS: Record<string, string> = {
  member: 'roleMember',
  group_leader: 'roleGroupLeader',
  ministry_leader: 'roleMinistryLeader',
  super_admin: 'roleSuperAdmin',
}

export default async function DashboardPage() {
  const { profile, church } = await getCurrentUserWithRole()
  const t = await getTranslations('dashboard')
  const locale = await getLocale()

  const isRTL = locale === 'ar'
  const firstName = isRTL
    ? (profile.first_name_ar || profile.first_name || t('fallbackUser'))
    : (profile.first_name || profile.first_name_ar || t('fallbackUser'))

  const churchName = isRTL
    ? (church.name_ar ?? church.name)
    : (church.name ?? church.name_ar)

  const roleKey = ROLE_KEYS[profile.role] ?? 'roleMember'

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('welcome', { name: firstName })} 👋
        </h1>
        <p className="text-muted-foreground">
          {churchName}
        </p>
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          {t(roleKey)}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('statsMembers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('statsPlaceholder')}</div>
            <p className="text-xs text-muted-foreground">{t('statsComingSoon')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('statsVisitors')}</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('statsPlaceholder')}</div>
            <p className="text-xs text-muted-foreground">{t('statsComingSoon')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('statsEvents')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('statsPlaceholder')}</div>
            <p className="text-xs text-muted-foreground">{t('statsComingSoon')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('statsServing')}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('statsPlaceholder')}</div>
            <p className="text-xs text-muted-foreground">{t('statsComingSoon')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gettingStartedTitle')}</CardTitle>
          <CardDescription>{t('gettingStartedDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✅ {t('stepSignedIn')}</p>
            <p>⬜ {t('stepAddMembers')}</p>
            <p>⬜ {t('stepCreateGroups')}</p>
            <p>⬜ {t('stepShareQR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
