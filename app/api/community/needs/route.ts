import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateChurchNeedSchema } from '@/lib/schemas/church-need'
import { createAdminClient } from '@/lib/supabase/server'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/community/needs — list all needs (cross-church)
export const GET = apiHandler(async ({ req, profile }) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const urgency = searchParams.get('urgency')
  const status = searchParams.get('status')
  const country = searchParams.get('country')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '24'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Use admin client to bypass per-church RLS for cross-church reads
  const admin = await createAdminClient()

  let query = admin
    .from('church_needs')
    .select(
      'id, church_id, title, title_ar, description, description_ar, image_url, category, quantity, urgency, status, contact_name, contact_phone, contact_email, expires_at, fulfilled_at, created_at, church:church_id(id, name, name_ar, country, logo_url, denomination)',
      { count: 'exact' }
    )
    .in('status', ['open', 'in_progress'])
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (category) query = query.eq('category', category)
  if (urgency) query = query.eq('urgency', urgency)
  if (status) query = query.eq('status', status)
  if (country) query = query.eq('church.country', country)
  if (search) {
    const safe = sanitizeLikePattern(search)
    query = query.or(`title.ilike.%${safe}%,title_ar.ilike.%${safe}%,description.ilike.%${safe}%,description_ar.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) }
}, { requirePermissions: ['can_view_church_needs'] })

// POST /api/community/needs — create a need
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateChurchNeedSchema, body)

  const { data, error } = await supabase
    .from('church_needs')
    .insert({
      ...validated,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidateTag('church-needs')
  return { data }
}, { requirePermissions: ['can_manage_church_needs'] })
