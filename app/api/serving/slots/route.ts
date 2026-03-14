import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateServingSlotSchema } from '@/lib/schemas/serving'

interface ServingSignup {
  id: string
  status: string
}

interface SlotWithSignups {
  id: string
  serving_area_id: string
  title: string
  title_ar: string | null
  date: string
  start_time: string | null
  end_time: string | null
  max_volunteers: number | null
  notes: string | null
  notes_ar: string | null
  church_id: string
  created_at: string
  serving_areas: { name: string; name_ar: string | null } | null
  serving_signups: ServingSignup[] | null
}

// GET /api/serving/slots — list slots with signup counts
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const areaId = searchParams.get('area_id')
  const upcoming = searchParams.get('upcoming')

  let query = supabase
    .from('serving_slots')
    .select('id, serving_area_id, title, title_ar, date, start_time, end_time, max_volunteers, notes, notes_ar, church_id, created_at, serving_areas(name, name_ar), serving_signups(id, status)')
    .eq('church_id', profile.church_id)
    .order('date', { ascending: true })

  if (areaId) {
    query = query.eq('serving_area_id', areaId)
  }

  if (upcoming === 'true') {
    query = query.gte('date', new Date().toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) throw error

  // Add signup count to each slot
  const enriched = ((data as unknown as SlotWithSignups[]) || []).map((slot) => ({
    ...slot,
    signup_count: slot.serving_signups?.filter((s) => s.status !== 'cancelled').length || 0,
    serving_signups: undefined,
  }))

  return { data: enriched }
}, { cache: 'private, max-age=15, stale-while-revalidate=60' })

// POST /api/serving/slots — create slot (admin only)
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateServingSlotSchema, body)

  const { data, error } = await supabase
    .from('serving_slots')
    .insert({
      ...validated,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select('id, serving_area_id, title, title_ar, date, start_time, end_time, max_volunteers, notes, notes_ar, church_id, created_at')
    .single()

  if (error) throw error
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_serving'] })
