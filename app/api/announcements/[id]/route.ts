import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateAnnouncementSchema } from '@/lib/schemas/announcement'

// GET /api/announcements/[id]
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, title_ar, body, body_ar, status, is_pinned, published_at, expires_at, created_at, created_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) throw error
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })

  return { data }
})

// PATCH /api/announcements/[id] — update (admin only)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateAnnouncementSchema, await req.json())

  // If publishing, set published_at
  let published_at: string | undefined
  if (body.status === 'published') {
    const { data: existing } = await supabase
      .from('announcements')
      .select('published_at')
      .eq('id', id)
      .eq('church_id', profile.church_id)
      .single()

    if (existing && !existing.published_at) {
      published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('announcements')
    .update({ ...body, ...(published_at ? { published_at } : {}) })
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, title, title_ar, body, body_ar, status, is_pinned, published_at, expires_at, created_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_announcements'] })

// DELETE /api/announcements/[id] — delete (admin only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
}, { requirePermissions: ['can_manage_announcements'] })
