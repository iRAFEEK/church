import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NotificationsClient, type NotificationsInitialData } from './NotificationsClient'

// PERF-1: this is the busiest screen (reachable from the bell on every page). It used
// to be 100% client-rendered — skeleton → JS download → hydrate → THEN two client
// fetches, ~0.6–1.4s of extra blank time on 3G. The server now fetches page-1 with
// default filters (mirroring /api/notifications GET exactly) and hands it to the
// client island; pagination, filters and realtime stay client-side.
const PAGE_SIZE = 20

export default async function NotificationsPage() {
  const user = await getCurrentUserWithRole()
  const supabase = await createClient()

  const [listRes, unreadRes] = await Promise.all([
    supabase
      .from('notifications_log')
      .select('id, type, channel, title, body, payload, status, read_at, reference_id, reference_type, sent_at, created_at', { count: 'exact' })
      .eq('profile_id', user.id)
      .eq('church_id', user.profile.church_id)
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from('notifications_log')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('church_id', user.profile.church_id)
      .eq('channel', 'in_app')
      .is('read_at', null),
  ])

  // On a query error fall back to client fetching (initialData=null) rather than erroring the page.
  const initialData: NotificationsInitialData | null = listRes.error
    ? null
    : {
        data: (listRes.data ?? []) as NotificationsInitialData['data'],
        count: listRes.count ?? 0,
        totalPages: Math.max(1, Math.ceil((listRes.count ?? 0) / PAGE_SIZE)),
        unreadCount: unreadRes.count ?? 0,
      }

  return <NotificationsClient initialData={initialData} initialRole={user.profile.role} />
}
