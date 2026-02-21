import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/serving/slots — list slots with signup counts
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const areaId = searchParams.get('area_id')
  const upcoming = searchParams.get('upcoming')

  let query = supabase
    .from('serving_slots')
    .select('*, serving_areas(name, name_ar), serving_signups(id, status)')
    .eq('church_id', profile.church_id)
    .order('date', { ascending: true })

  if (areaId) {
    query = query.eq('serving_area_id', areaId)
  }

  if (upcoming === 'true') {
    query = query.gte('date', new Date().toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add signup count to each slot
  const enriched = (data || []).map((slot: any) => ({
    ...slot,
    signup_count: slot.serving_signups?.filter((s: any) => s.status !== 'cancelled').length || 0,
    serving_signups: undefined,
  }))

  return NextResponse.json({ data: enriched })
}

// POST /api/serving/slots — create slot (admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['super_admin', 'ministry_leader'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('serving_slots')
    .insert({
      ...body,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
