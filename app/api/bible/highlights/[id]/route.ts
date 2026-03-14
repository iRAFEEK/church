import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateHighlightSchema } from '@/lib/schemas/bible'

// PATCH /api/bible/highlights/[id] — update highlight color
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = validate(UpdateHighlightSchema, await req.json())

  const { data, error } = await supabase
    .from('bible_highlights')
    .update({ color: body.color })
    .eq('id', id)
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) throw error
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })

  return { data }
})

// DELETE /api/bible/highlights/[id] — remove highlight
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('bible_highlights')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  return { success: true }
})
