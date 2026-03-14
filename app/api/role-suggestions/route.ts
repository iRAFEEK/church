import { apiHandler } from '@/lib/api/handler'

// GET /api/role-suggestions — distinct role values for autocomplete
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('event_service_assignments')
    .select('role')
    .eq('church_id', profile.church_id)
    .not('role', 'is', null)
    .limit(500)

  if (error) throw error

  const unique = [...new Set((data || []).map((d: { role: string }) => d.role).filter(Boolean))]
  return { data: unique }
}, { cache: 'private, max-age=300, stale-while-revalidate=600' })
