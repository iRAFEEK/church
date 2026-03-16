import { apiHandler } from '@/lib/api/handler'

// GET /api/service-requests/mine — get pending service requests for the current user
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('event_service_requests')
    .select(`
      id, event_id, requested_role, status, notes, created_at,
      requested_by_profile:requested_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      event:event_id(id, title, title_ar, starts_at, location, status)
    `)
    .eq('assigned_to', profile.id)
    .eq('church_id', profile.church_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) throw error
  return { data: data ?? [] }
}, { cache: 'private, max-age=15' })
