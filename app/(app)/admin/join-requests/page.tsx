import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { UserPlus } from 'lucide-react'
import { JoinRequestList, type JoinRequest, type PendingMember } from '@/components/churches/JoinRequestList'

type PendingMemberRow = {
  user_id: string
  joined_at: string | null
  profile: {
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    phone: string | null
    email: string | null
  } | null
}

// Church join-request approval queue — super_admin + ministry_leader only.
// Surfaces BOTH cross-church join requests (church_join_requests) and same-church
// first-join self-signups awaiting approval (pending user_churches rows — migration 088).
export default async function JoinRequestsPage() {
  const { profile } = await requireRole('ministry_leader', 'super_admin')
  const supabase = await createClient()

  // NOTE: user_churches.user_id references auth.users (no FK to profiles), so PostgREST
  // cannot embed profiles on that column — fetch memberships, then profiles by id.
  const [requestsRes, membersRes] = await Promise.all([
    supabase
      .from('church_join_requests')
      .select('id, profile_id, message, created_at, requester_name, requester_name_ar, requester_phone, requester_email')
      .eq('church_id', profile.church_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100),
    supabase
      .from('user_churches')
      .select('user_id, joined_at')
      .eq('church_id', profile.church_id)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })
      .limit(100),
  ])

  const memberRows = (membersRes.data ?? []) as { user_id: string; joined_at: string | null }[]
  let profilesById = new Map<string, PendingMemberRow['profile']>()
  if (memberRows.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, email')
      .in('id', memberRows.map((m) => m.user_id))
    profilesById = new Map((profs ?? []).map((p) => [p.id as string, p as PendingMemberRow['profile']]))
  }

  const t = await getTranslations('joinRequests')
  const requests = (requestsRes.data ?? []) as unknown as JoinRequest[]
  const pendingMembers: PendingMember[] = memberRows.map((m) => {
    const p = profilesById.get(m.user_id)
    return {
      user_id: m.user_id,
      created_at: m.joined_at,
      name: p?.first_name ?? null,
      name_ar: p?.first_name_ar ?? null,
      last_name: p?.last_name ?? null,
      last_name_ar: p?.last_name_ar ?? null,
      phone: p?.phone ?? null,
      email: p?.email ?? null,
    }
  })

  return (
    <div className="px-4 md:px-6 pb-24 max-w-3xl mx-auto">
      <header className="py-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-zinc-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{t('subtitle')}</p>
      </header>

      <JoinRequestList initialRequests={requests} initialPendingMembers={pendingMembers} />
    </div>
  )
}
