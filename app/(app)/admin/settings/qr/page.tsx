import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { QRGenerator } from '@/components/admin/QRGenerator'
import { VisitorFormConfigurator } from '@/components/admin/VisitorFormConfigurator'
import { getTranslations } from 'next-intl/server'
import type { VisitorFormField } from '@/lib/schemas/visitor-form-config'

const DEFAULT_FIELDS: VisitorFormField[] = [
  { key: 'first_name', required: true, enabled: true },
  { key: 'last_name', required: true, enabled: true },
  { key: 'phone', enabled: true, required: false },
  { key: 'email', enabled: true, required: false },
  { key: 'age_range', enabled: true, required: false },
  { key: 'occupation', enabled: false, required: false },
  { key: 'how_heard', enabled: true, required: false },
]

export default async function QRPage() {
  const user = await requireRole('ministry_leader', 'super_admin')

  const t = await getTranslations('qr')
  const supabase = await createClient()

  const { data: church } = await supabase
    .from('churches')
    .select('id, name, name_ar, logo_url, visitor_form_config')
    .eq('id', user.profile.church_id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const joinUrl = `${appUrl}/join?church=${church?.id}`
  const isLocalhost = appUrl.includes('localhost')

  const formConfig = (church?.visitor_form_config as { fields: VisitorFormField[] } | null) ?? { fields: DEFAULT_FIELDS }

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('pageSubtitle')}</p>
      </div>

      {isLocalhost && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {t('localhostWarning')}
        </div>
      )}

      <QRGenerator joinUrl={joinUrl} churchName={church?.name_ar || church?.name || 'Church'} />

      {user.profile.role === 'super_admin' && (
        <VisitorFormConfigurator initialConfig={formConfig} />
      )}
    </div>
  )
}
