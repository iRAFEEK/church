import { requirePermission } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { MapPin } from 'lucide-react'
import { OutreachDashboard } from '@/components/outreach/OutreachDashboard'

export default async function OutreachPage() {
  await requirePermission('can_manage_outreach')
  const t = await getTranslations('outreach')

  return (
    <div className="space-y-6 pb-24">
      <div>
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <OutreachDashboard />
    </div>
  )
}
