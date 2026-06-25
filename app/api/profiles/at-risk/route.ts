import { apiHandler } from '@/lib/api/handler'
import { canCallerViewMemberPhones } from '@/lib/members/visibility'

// GET /api/profiles/at-risk — members flagged as at-risk.
// Returns member contact info (incl. phone); gated to those who can view members
// (SEC: previously ungated — any authenticated member could read it).
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone, updated_at, group_members(group_id, group:group_id(id, name, name_ar, leader_id))')
    .eq('church_id', profile.church_id)
    .eq('status', 'at_risk')
    .order('updated_at', { ascending: true })

  if (error) throw error

  // Member-directory privacy (A5, church-wide): strip phone unless allowed by the
  // church's visibility setting for this caller's role.
  const canSeePhone = await canCallerViewMemberPhones(supabase, profile.church_id, profile.role)
  const rows = canSeePhone
    ? data
    : (data ?? []).map((m) => ({ ...m, phone: null }))

  return { data: rows }
}, { requirePermissions: ['can_view_members'] })
