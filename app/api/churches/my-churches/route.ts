import { apiHandler } from '@/lib/api/handler'

// GET /api/churches/my-churches — list all churches the user belongs to
export const GET = apiHandler(async ({ supabase, user, profile }) => {
  // Fetch all memberships with church details
  const { data, error } = await supabase
    .from('user_churches')
    .select('id, user_id, church_id, role, joined_at, church:church_id(id, name, name_ar, logo_url, country)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  if (error) throw error

  const result = (data ?? []).map((row) => ({
    ...row,
    is_active: row.church_id === profile.church_id,
  }))

  // Sort: active church first
  result.sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))

  return result
})
