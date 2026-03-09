import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/outreach/visits — list visits
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_outreach) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profile_id')

  let query = supabase
    .from('outreach_visits')
    .select(`
      id, profile_id, visited_by, visit_date, notes, needs_followup, followup_date, followup_notes, created_at,
      profile:profiles!outreach_visits_profile_id_fkey(id, first_name, last_name, first_name_ar, last_name_ar, phone, address, city, photo_url),
      visitor:profiles!outreach_visits_visited_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
    `)
    .eq('church_id', profile.church_id)
    .order('visit_date', { ascending: false })
    .limit(100)

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// POST /api/outreach/visits — log a new visit
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_outreach) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { profile_id, visit_date, notes, needs_followup, followup_date, followup_notes } = body

  if (!profile_id) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('outreach_visits')
    .insert({
      church_id: profile.church_id,
      profile_id,
      visited_by: user.id,
      visit_date: visit_date || new Date().toISOString().split('T')[0],
      notes: notes || null,
      needs_followup: needs_followup || false,
      followup_date: followup_date || null,
      followup_notes: followup_notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
