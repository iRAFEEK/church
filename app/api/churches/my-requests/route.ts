import { apiHandler } from '@/lib/api/handler'

// GET /api/churches/my-requests — the caller's own pending "join another church" requests,
// so the church switcher can show them as "awaiting approval".
export const GET = apiHandler(async ({ supabase, user }) => {
  const { data, error } = await supabase
    .from('church_join_requests')
    .select('id, church_id, created_at, church:church_id(id, name, name_ar, country)')
    .eq('profile_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) throw error
  return data ?? []
})
