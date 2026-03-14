import { apiHandler } from '@/lib/api/handler'

// GET /api/profiles/[id]/attendance — attendance history for a member
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('attendance')
    .select('id, status, marked_at, gathering:gathering_id(id, scheduled_at, topic, status, group:group_id(id, name, name_ar))')
    .eq('profile_id', id)
    .eq('church_id', profile.church_id)
    .order('marked_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return { data }
})
