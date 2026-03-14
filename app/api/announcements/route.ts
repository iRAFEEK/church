import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateAnnouncementSchema } from '@/lib/schemas/announcement'

// GET /api/announcements — list announcements
export const GET = apiHandler(async ({ req, supabase, profile, resolvedPermissions }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const isAdmin = resolvedPermissions.can_manage_announcements

  let query = supabase
    .from('announcements')
    .select('id, title, title_ar, body, body_ar, status, is_pinned, expires_at, published_at, created_at, created_by', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  } else if (!isAdmin) {
    query = query.eq('status', 'published')
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) }
})

// POST /api/announcements — create announcement (admin only)
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateAnnouncementSchema, body)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...validated,
      church_id: profile.church_id,
      created_by: user.id,
      published_at: validated.status === 'published' ? now : null,
    })
    .select('id, church_id, title, title_ar, body, body_ar, status, is_pinned, expires_at, published_at, created_by, created_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_announcements'] })
