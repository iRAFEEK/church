import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { BroadcastComposer } from '@/components/conference/BroadcastComposer'

export default async function BroadcastsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const locale = await getLocale()
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  const [{ data: broadcasts }, { data: teams }, { data: areas }] = await Promise.all([
    supabase
      .from('conference_broadcasts')
      .select(
        'id, message, message_ar, is_urgent, scope, team_id, area_id, created_at, sender:sent_by(first_name, last_name, first_name_ar, last_name_ar)'
      )
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('conference_teams')
      .select('id, name, name_ar')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(200),
    supabase
      .from('conference_areas')
      .select('id, name, name_ar')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(100),
  ])

  // Supabase returns FK joins as arrays when using no-generic client;
  // we cast through unknown to the narrower interface our component expects.
  type BroadcastRow = Parameters<typeof BroadcastComposer>[0]['initialBroadcasts'][0]

  return (
    <BroadcastComposer
      eventId={id}
      churchId={user.profile.church_id}
      initialBroadcasts={(broadcasts || []).map((b) => ({
        ...b,
        sender: Array.isArray(b.sender) ? (b.sender[0] || null) : b.sender,
      })) as unknown as BroadcastRow[]}
      teams={(teams || []) as Array<{ id: string; name: string; name_ar: string | null }>}
      areas={(areas || []) as Array<{ id: string; name: string; name_ar: string | null }>}
      locale={locale}
    />
  )
}
