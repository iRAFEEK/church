import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { UserPlus } from 'lucide-react'
import { JoinRequestList, type JoinRequest } from '@/components/churches/JoinRequestList'

// Church join-request approval queue — super_admin + ministry_leader only.
export default async function JoinRequestsPage() {
  const { profile } = await requireRole('ministry_leader', 'super_admin')
  const supabase = await createClient()

  const { data } = await supabase
    .from('church_join_requests')
    .select('id, profile_id, message, created_at, requester_name, requester_name_ar, requester_phone, requester_email')
    .eq('church_id', profile.church_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  const t = await getTranslations('joinRequests')
  const requests = (data ?? []) as unknown as JoinRequest[]

  return (
    <div className="px-4 md:px-6 pb-24 max-w-3xl mx-auto">
      <header className="py-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-zinc-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{t('subtitle')}</p>
      </header>

      <JoinRequestList initialRequests={requests} />
    </div>
  )
}
