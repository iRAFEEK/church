import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateOutreachVisitSchema } from '@/lib/schemas/outreach'

// GET /api/outreach/visits — list visits
export const GET = apiHandler(async ({ req, supabase, profile }) => {
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
  if (error) throw error

  return { data }
}, { requirePermissions: ['can_manage_outreach'] })

// POST /api/outreach/visits — log a new visit
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = validate(CreateOutreachVisitSchema, await req.json())

  const { data, error } = await supabase
    .from('outreach_visits')
    .insert({
      church_id: profile.church_id,
      profile_id: body.profile_id,
      visited_by: user.id,
      visit_date: body.visit_date || new Date().toISOString().split('T')[0],
      notes: body.notes || null,
      needs_followup: body.needs_followup,
      followup_date: body.followup_date || null,
      followup_notes: body.followup_notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_outreach'] })
