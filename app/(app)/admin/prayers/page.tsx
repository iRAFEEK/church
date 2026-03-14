import { requirePermission } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { HeartHandshake } from 'lucide-react'
import { ChurchPrayerList } from '@/components/prayer/ChurchPrayerList'

export default async function AdminPrayersPage() {
  await requirePermission('can_view_prayers')
  const t = await getTranslations('churchPrayer')

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t('adminTitle')}</h1>
      </div>

      <ChurchPrayerList />
    </div>
  )
}
