import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { ConferenceMindMapLoader } from '@/components/conference/ConferenceMindMapLoader'
import type { ConferenceMindMapProps } from '@/components/conference/ConferenceMindMap'
import type { TeamWithCard } from '@/components/conference/mind-map/useMindMapLayout'
import type { ConferenceArea } from '@/types'

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const locale = await getLocale()
  const isRTL = locale.startsWith('ar')
  const supabase = await createClient()

  const [
    { data: event },
    { data: areas },
    { data: teams },
    { data: ministries },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, title_ar, conference_mode, conference_settings')
      .eq('id', id)
      .eq('church_id', user.profile.church_id)
      .single(),
    supabase
      .from('conference_areas')
      .select('id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order, created_at, updated_at')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(200),
    supabase
      .from('conference_teams')
      .select('id, name, name_ar, area_id, target_headcount')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(500),
    supabase
      .from('ministries')
      .select('id, name, name_ar')
      .eq('church_id', user.profile.church_id)
      .eq('is_active', true)
      .order('name')
      .limit(100),
  ])

  if (!event) notFound()

  const teamIds = (teams || []).map((t) => t.id)

  // Fetch cards linked to teams (using team_id from migration 075)
  const { data: cards } = teamIds.length > 0
    ? await supabase
        .from('conference_board_cards')
        .select('id, team_id, ministry_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order, leader_notified_at, column_id, assigned_leader_external_phone, created_at, updated_at')
        .in('team_id', teamIds)
        .eq('church_id', user.profile.church_id)
        .limit(500)
    : { data: [] }

  // Fetch ministry names for cards
  const ministryIds = [...new Set((cards || []).map((c) => c.ministry_id).filter(Boolean))]
  const { data: ministryDetails } = ministryIds.length > 0
    ? await supabase
        .from('ministries')
        .select('id, name, name_ar')
        .in('id', ministryIds as string[])
    : { data: [] }

  // Fetch leader profiles
  const leaderIds = [...new Set((cards || []).map((c) => c.assigned_leader_id).filter(Boolean))]
  const { data: leaderProfiles } = leaderIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url')
        .in('id', leaderIds as string[])
        .eq('church_id', user.profile.church_id)
    : { data: [] }

  const ministryMap = new Map((ministryDetails || []).map((m) => [m.id, m]))
  const leaderMap = new Map((leaderProfiles || []).map((p) => [p.id, p]))
  const cardsByTeam = new Map((cards || []).map((c) => [c.team_id, c]))

  const eventTitle = isRTL ? (event.title_ar || event.title) : event.title

  // Build TeamWithCard objects
  const teamsWithCards: TeamWithCard[] = (teams || []).map((team) => {
    const card = cardsByTeam.get(team.id)
    const ministry = card?.ministry_id ? ministryMap.get(card.ministry_id) : null
    const leader = card?.assigned_leader_id ? leaderMap.get(card.assigned_leader_id) : null
    return {
      id: team.id,
      name: team.name,
      name_ar: team.name_ar,
      area_id: team.area_id,
      target_headcount: team.target_headcount,
      cardStatus: card?.status,
      ministryName: ministry?.name ?? null,
      ministryNameAr: ministry?.name_ar ?? null,
      assignedLeaderName: leader
        ? `${leader.first_name} ${leader.last_name}`.trim()
        : null,
    }
  })

  // Build full cards for sheet
  const fullCards = (cards || []).map((c) => ({
    ...c,
    church_id: user.profile.church_id,
    event_id: id,
    ministry: c.ministry_id ? ministryMap.get(c.ministry_id) || null : null,
    assigned_leader: c.assigned_leader_id ? leaderMap.get(c.assigned_leader_id) || null : null,
    task_count: 0,
    done_task_count: 0,
    resource_count: 0,
  }))

  const settings = event.conference_settings as Record<string, unknown> | null
  const initialCanvas = (settings?.canvas as ConferenceMindMapProps['initialCanvas']) ?? null

  const props: ConferenceMindMapProps = {
    eventId: id,
    churchId: user.profile.church_id,
    eventTitle: eventTitle ?? event.title,
    initialAreas: (areas || []) as ConferenceArea[],
    initialTeams: teamsWithCards,
    ministries: (ministries || []) as Array<{ id: string; name: string; name_ar: string | null }>,
    initialCards: fullCards as ConferenceMindMapProps['initialCards'],
    initialCanvas,
    locale,
  }

  return (
    // Full-height canvas — parent layout has pb-0 for this page
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <ConferenceMindMapLoader {...props} />
    </div>
  )
}

