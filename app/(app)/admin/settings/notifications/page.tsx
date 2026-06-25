import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { NotificationChannelSettings } from '@/components/admin/NotificationChannelSettings'

export const dynamic = 'force-dynamic'

export default async function NotificationSettingsPage() {
  const user = await requireRole('super_admin')
  const t = await getTranslations('settings')
  const supabase = await createClient()

  const { data: church } = await supabase
    .from('churches')
    .select('whatsapp_notifications_enabled')
    .eq('id', user.profile.church_id)
    .single()

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('notificationsTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('notificationsSubtitle')}</p>
      </div>

      <NotificationChannelSettings
        initialWhatsappEnabled={church?.whatsapp_notifications_enabled === true}
      />
    </div>
  )
}
