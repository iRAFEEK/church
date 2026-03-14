import { apiHandler } from '@/lib/api/handler'
import { z } from 'zod'
import { validate } from '@/lib/api/validate'

const BiblePreferenceSchema = z.object({
  preferred_bible_id: z.string().min(1),
})

// PATCH /api/profile/bible-preference — save preferred Bible version
export const PATCH = apiHandler(async ({ req, supabase, user }) => {
  const body = validate(BiblePreferenceSchema, await req.json())

  const { error } = await supabase
    .from('profiles')
    .update({ preferred_bible_id: body.preferred_bible_id })
    .eq('id', user.id)

  if (error) throw error
  return { success: true }
})
