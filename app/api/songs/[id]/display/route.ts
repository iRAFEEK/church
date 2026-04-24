import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { DisplaySettingsSchema } from '@/lib/schemas/song'

// PATCH /api/songs/[id]/display — update display settings only
export const PATCH = apiHandler(async ({ req, supabase, params }) => {
  const body = await req.json()
  const display_settings = validate(DisplaySettingsSchema, body)

  const { data, error } = await supabase
    .from('songs')
    .update({ display_settings })
    .eq('id', params!.id)
    .select('display_settings')
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_manage_songs'] })
