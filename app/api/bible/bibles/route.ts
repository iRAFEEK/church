import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/bible/bibles — list all available Bible versions
// Uses admin client because bible_versions is shared reference data (not tenant-scoped)
export const GET = apiHandler(async () => {
  const adminSupabase = await createAdminClient()

  const { data, error } = await adminSupabase
    .from('bible_versions')
    .select('id, name, name_local, abbreviation, abbreviation_local, language_id, language_name, language_name_local, copyright')
    .order('language_id')

  if (error) throw error

  return { data: data || [] }
}, { cache: 'public, max-age=3600, stale-while-revalidate=86400' })
