import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { MemberDirectoryPrivacySettings } from '@/components/admin/MemberDirectoryPrivacySettings'
import type { MemberDirectoryVisibility } from '@/lib/members/visibility'

export const dynamic = 'force-dynamic'

export default async function PrivacySettingsPage() {
  const user = await requireRole('super_admin')
  const t = await getTranslations('settings')
  const supabase = await createClient()

  const { data: church } = await supabase
    .from('churches')
    .select('member_directory_visibility')
    .eq('id', user.profile.church_id)
    .single()

  const initialVisibility = (church?.member_directory_visibility ?? 'leaders_only') as MemberDirectoryVisibility

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('privacyTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('privacySubtitle')}</p>
      </div>

      <MemberDirectoryPrivacySettings initialVisibility={initialVisibility} />
    </div>
  )
}
