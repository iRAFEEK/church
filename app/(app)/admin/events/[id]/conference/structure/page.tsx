import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { AreaTree } from '@/components/conference/AreaTree'
import type { ConferenceAreaWithChildren, ConferenceTeam } from '@/types'

function buildAreaTree(
  areas: Array<{ id: string; parent_area_id: string | null; name: string; name_ar: string | null; sort_order: number }>,
  teams: ConferenceTeam[],
  parentId: string | null = null
): ConferenceAreaWithChildren[] {
  return areas
    .filter((a) => a.parent_area_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((area) => ({
      id: area.id,
      church_id: '',
      event_id: '',
      parent_area_id: area.parent_area_id,
      name: area.name,
      name_ar: area.name_ar,
      description: null,
      description_ar: null,
      location_hint: null,
      location_hint_ar: null,
      sort_order: area.sort_order,
      created_at: '',
      updated_at: '',
      children: buildAreaTree(areas, teams, area.id),
      teams: teams.filter((t) => t.area_id === area.id),
    }))
}

export default async function StructurePage({ params }: { params: Promise<{ id: string }> }) {
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

  const [{ data: areas }, { data: teams }] = await Promise.all([
    supabase
      .from('conference_areas')
      .select('id, parent_area_id, name, name_ar, sort_order')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order'),
    supabase
      .from('conference_teams')
      .select('id, area_id, name, name_ar, muster_point, muster_point_ar, target_headcount, sort_order')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order'),
  ])

  const areaTree = buildAreaTree(areas || [], (teams || []) as unknown as ConferenceTeam[])

  return (
    <AreaTree
      eventId={id}
      churchId={user.profile.church_id}
      initialAreas={areaTree}
      locale={locale}
    />
  )
}
