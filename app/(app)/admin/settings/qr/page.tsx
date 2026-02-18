import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QRGenerator } from '@/components/admin/QRGenerator'
import { getTranslations } from 'next-intl/server'

export default async function QRPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('qr')
  const supabase = await createClient()

  const { data: church } = await supabase
    .from('churches')
    .select('id,name,name_ar,logo_url')
    .eq('id', user.profile.church_id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const joinUrl = `${appUrl}/join?church=${church?.id}`

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {t('pageSubtitle')}
        </p>
      </div>
      <QRGenerator joinUrl={joinUrl} churchName={church?.name_ar || church?.name || 'Church'} />
    </div>
  )
}
