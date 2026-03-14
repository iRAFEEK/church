import { apiHandler } from '@/lib/api/handler'

// GET /api/profiles/at-risk — members flagged as at-risk
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone, updated_at, group_members(group_id, group:group_id(id, name, name_ar, leader_id))')
    .eq('church_id', profile.church_id)
    .eq('status', 'at_risk')
    .order('updated_at', { ascending: true })

  if (error) throw error

  return { data }
})
