import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { VolunteerAssignment } from '@/components/conference/VolunteerAssignment'
import { Card, CardContent } from '@/components/ui/card'
import { getTranslations } from 'next-intl/server'
import { Users } from 'lucide-react'

export default async function MyAssignmentPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const user = await getCurrentUserWithRole()
  const locale = await getLocale()
  const t = await getTranslations('conference')

  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, title_ar, conference_mode, starts_at, ends_at')
    .eq('id', eventId)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  // Find this user's team membership for this event
  const { data: membership } = await supabase
    .from('conference_team_members')
    .select('id, role, checkin_status, shift_start, shift_end, team_id')
    .eq('profile_id', user.profile.id)
    .eq('event_id', eventId)
    .eq('church_id', user.profile.church_id)
    .maybeSingle()

  if (!membership) {
    const isRTL = locale.startsWith('ar')
    const eventTitle = isRTL ? (event.title_ar || event.title) : event.title
    return (
      <div className="space-y-4 pb-24 max-w-lg mx-auto text-center py-16">
        <h1 className="text-xl font-bold">{eventTitle}</h1>
        <Card>
          <CardContent className="py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">{t('notAssigned')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('notAssignedDesc')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch team + tasks + recent broadcasts
  const [{ data: team }, { data: myTasks }, { data: broadcasts }] = await Promise.all([
    supabase
      .from('conference_teams')
      .select('id, name, name_ar, muster_point, muster_point_ar, target_headcount')
      .eq('id', membership.team_id)
      .eq('church_id', user.profile.church_id)
      .single(),
    supabase
      .from('conference_tasks')
      .select('id, title, status, priority, due_at')
      .eq('team_id', membership.team_id)
      .eq('event_id', eventId)
      .eq('church_id', user.profile.church_id)
      .neq('status', 'done')
      .order('priority', { ascending: false })
      .limit(20),
    supabase
      .from('conference_broadcasts')
      .select('id, message, message_ar, is_urgent, scope, created_at')
      .eq('event_id', eventId)
      .eq('church_id', user.profile.church_id)
      .or(`scope.eq.all,team_id.eq.${membership.team_id}`)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <VolunteerAssignment
      eventId={eventId}
      event={{
        title: event.title,
        title_ar: event.title_ar,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
      }}
      membership={membership as Parameters<typeof VolunteerAssignment>[0]['membership']}
      team={team as Parameters<typeof VolunteerAssignment>[0]['team']}
      tasks={(myTasks || []) as Parameters<typeof VolunteerAssignment>[0]['tasks']}
      broadcasts={(broadcasts || []) as Parameters<typeof VolunteerAssignment>[0]['broadcasts']}
      locale={locale}
    />
  )
}
