import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ShieldCheck } from 'lucide-react'
import { getCurrentUserWithRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform'
import { PendingChurchList, type PendingChurch } from '@/components/platform/PendingChurchList'
import { ApproverManager } from '@/components/platform/ApproverManager'

// Ekklesia admin hub — the platform-operator area. Gated by the email allowlist
// (isPlatformAdmin: env bootstrap OR platform_admins table), NOT by church role.
export default async function PlatformHomePage() {
  const { email } = await getCurrentUserWithRole()
  if (!(await isPlatformAdmin(email))) {
    redirect('/dashboard')
  }

  // Service-role client: pending churches have no relationship to this operator, so RLS
  // would hide them from a normal client.
  const admin = await createAdminClient()
  const { data } = await admin
    .from('churches')
    .select('id, name, name_ar, country, created_at, pending_contact_name, pending_contact_email, pending_contact_phone')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  const t = await getTranslations('platformHome')
  const pending = (data ?? []) as PendingChurch[]

  return (
    <div className="px-4 md:px-6 pb-24 max-w-3xl mx-auto space-y-8">
      <header className="py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-zinc-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{t('subtitle')}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">{t('pendingChurchesTitle')}</h2>
        <p className="text-sm text-zinc-500 mb-3">{t('pendingChurchesSubtitle', { count: pending.length })}</p>
        <PendingChurchList initialChurches={pending} />
      </section>

      <ApproverManager />
    </div>
  )
}

export const dynamic = 'force-dynamic'
