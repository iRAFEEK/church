import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Building2 } from 'lucide-react'
import { getCurrentUserWithRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform'
import { PendingChurchList, type PendingChurch } from '@/components/platform/PendingChurchList'

// Platform admin queue: churches awaiting review. Gated by email allow-list
// (PLATFORM_ADMIN_EMAILS), not by church role.
//
// NOTE: nav integration is a follow-up — the sidebar/bottom-nav is role-based and
// can't be gated by email. Platform admins reach this screen by direct URL for now.
export default async function PlatformChurchesPage() {
  const { email } = await getCurrentUserWithRole()
  if (!isPlatformAdmin(email)) {
    redirect('/dashboard')
  }

  // Service-role client: pending churches have no member relationship to the platform
  // admin, so RLS would hide them from a normal client.
  const admin = await createAdminClient()
  const { data } = await admin
    .from('churches')
    .select('id, name, name_ar, country, created_at, pending_contact_name, pending_contact_email, pending_contact_phone')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  const t = await getTranslations('platformChurches')
  const churches = (data ?? []) as PendingChurch[]

  return (
    <div className="px-4 md:px-6 pb-24 max-w-3xl mx-auto">
      <header className="py-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-zinc-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{t('subtitle')}</p>
      </header>

      <PendingChurchList initialChurches={churches} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
