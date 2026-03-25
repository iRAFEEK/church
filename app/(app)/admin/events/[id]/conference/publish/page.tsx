import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { PublishSettings } from '@/components/conference/PublishSettings'

export default async function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const locale = await getLocale()
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, title_ar, conference_mode, conference_settings')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  return (
    <PublishSettings
      eventId={id}
      conferenceMode={event.conference_mode}
      settings={(event.conference_settings || {}) as Record<string, unknown>}
      locale={locale}
    />
  )
}
