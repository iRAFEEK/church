import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateServingAreaSchema } from '@/lib/schemas/serving'

// GET /api/serving/areas — list serving areas
export const GET = apiHandler(async ({ supabase, profile, resolvedPermissions }) => {
  const isAdmin = resolvedPermissions.can_manage_serving

  let query = supabase
    .from('serving_areas')
    .select('*, ministries(name, name_ar)')
    .eq('church_id', profile.church_id)
    .order('name', { ascending: true })

  if (!isAdmin) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return { data }
})

// POST /api/serving/areas — create area (admin only)
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateServingAreaSchema, body)

  const { data, error } = await supabase
    .from('serving_areas')
    .insert({ ...validated, church_id: profile.church_id })
    .select()
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_manage_serving'] })
