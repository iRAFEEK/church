import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/leader/service-needs — service needs where current user is leader
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Find ministries where user is leader
  const { data: ledMinistries } = await supabase
    .from('ministries')
    .select('id')
    .eq('leader_id', user.id)
    .eq('church_id', profile.church_id)

  // Find groups where user is leader or co-leader
  const { data: ledGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('church_id', profile.church_id)
    .or(`leader_id.eq.${user.id},co_leader_id.eq.${user.id}`)

  const ministryIds = (ledMinistries || []).map((m: any) => m.id)
  const groupIds = (ledGroups || []).map((g: any) => g.id)

  if (ministryIds.length === 0 && groupIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // Build OR filter for service needs
  const filters: string[] = []
  if (ministryIds.length > 0) {
    filters.push(`ministry_id.in.(${ministryIds.join(',')})`)
  }
  if (groupIds.length > 0) {
    filters.push(`group_id.in.(${groupIds.join(',')})`)
  }

  const { data: needs, error } = await supabase
    .from('event_service_needs')
    .select(`
      *,
      ministry:ministry_id(id, name, name_ar),
      group:group_id(id, name, name_ar),
      event:event_id(id, title, title_ar, starts_at, ends_at, location, status),
      event_service_assignments(id, status)
    `)
    .eq('church_id', profile.church_id)
    .or(filters.join(','))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter to upcoming events only and enrich
  const now = new Date().toISOString()
  const enriched = (needs || [])
    .filter((n: any) => n.event && n.event.starts_at >= now && n.event.status !== 'cancelled')
    .map((n: any) => ({
      ...n,
      assigned_count: (n.event_service_assignments || []).filter(
        (a: any) => a.status !== 'declined'
      ).length,
      confirmed_count: (n.event_service_assignments || []).filter(
        (a: any) => a.status === 'confirmed'
      ).length,
      event_service_assignments: undefined,
    }))
    .sort((a: any, b: any) => a.event.starts_at.localeCompare(b.event.starts_at))

  return NextResponse.json({ data: enriched })
}
