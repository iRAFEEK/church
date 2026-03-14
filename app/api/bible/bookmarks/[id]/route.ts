import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateBookmarkSchema } from '@/lib/schemas/bible'

// PATCH /api/bible/bookmarks/[id] — update bookmark note
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateBookmarkSchema, await req.json())

  const { data, error } = await supabase
    .from('bible_bookmarks')
    .update({ note: body.note })
    .eq('id', id)
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) throw error
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })

  return { data }
})

// DELETE /api/bible/bookmarks/[id] — remove bookmark
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('bible_bookmarks')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  return { success: true }
})
