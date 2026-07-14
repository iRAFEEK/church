import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { MyVisitsList } from '@/components/outreach/OutreachAssignmentPanel'

// Member-facing "My Visits" page: every authenticated role can see the outreach
// visits assigned to them and log them. Data is fetched client-side from
// /api/outreach/assignments/my (purpose-bound contact disclosure lives there).
export default async function MyVisitsPage() {
  const user = await getCurrentUserWithRole()
  const t = await getTranslations('outreach')

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('myVisitsTitle')}</h1>
        <p className="text-muted-foreground">{t('myVisitsSubtitle')}</p>
      </div>

      <MyVisitsList churchId={user.profile.church_id} role={user.profile.role} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
