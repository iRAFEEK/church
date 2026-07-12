import { apiHandler } from '@/lib/api/handler'

// GET /api/events/upcoming — upcoming events for the "Add to service" picker.
// Church-scoped, published OR draft, starting from now, soonest first, capped at 25.
export const GET = apiHandler(async ({ supabase, profile }) => {
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('events')
    .select('id, title, title_ar, starts_at')
    .eq('church_id', profile.church_id)
    .in('status', ['published', 'draft'])
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(25)

  if (error) throw error
  return { data: data || [] }
}, { requirePermissions: ['can_manage_events'] })
