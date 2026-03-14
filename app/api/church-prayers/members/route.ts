import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// GET — Search church members for prayer assignment
export const GET = apiHandler(async ({ supabase, profile }) => {
  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  const { data, error } = await dbClient
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email')
    .eq('church_id', profile.church_id)
    .order('first_name_ar')
    .order('first_name')
    .limit(200)

  if (error) throw error

  return { data: data || [] }
}, { requirePermissions: ['can_view_prayers'] })
