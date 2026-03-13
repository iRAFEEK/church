import { notFound } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EventDetailClient } from './EventDetailClient'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  const supabase = await createClient()
  const churchId = user.profile.church_id

  // Fetch event + check registration status in parallel
  const [{ data: event }, { data: registration }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, registration_required, status')
      .eq('id', id)
      .eq('church_id', churchId)
      .single(),
    supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', id)
      .eq('profile_id', user.id)
      .maybeSingle(),
  ])

  if (!event) {
    notFound()
  }

  return (
    <EventDetailClient
      event={event}
      eventId={id}
      isRegistered={!!registration}
    />
  )
}

export const dynamic = 'force-dynamic'
