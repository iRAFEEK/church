import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

const ACTIVE_LIMIT = 50
const COMPLETED_LIMIT = 10

type MemberContact = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  phone: string | null
  address: string | null
  address_ar: string | null
  city: string | null
  city_ar: string | null
  address_notes: string | null
}

// GET /api/outreach/assignments/my — the caller's own outreach assignments
// (any authenticated role: members are the ones doing the visits).
export const GET = apiHandler(async ({ supabase, profile }) => {
  const churchId = profile.church_id

  // Step 1 — fetch ONLY the caller's assignment rows with the user-bound client
  // (RLS same-church + explicit assigned_to/church_id filters).
  const [activeRes, completedRes] = await Promise.all([
    supabase
      .from('outreach_assignments')
      .select('id, member_id, notes, status, created_at, updated_at')
      .eq('church_id', churchId)
      .eq('assigned_to', profile.id)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(ACTIVE_LIMIT),
    supabase
      .from('outreach_assignments')
      .select('id, member_id, notes, status, created_at, updated_at')
      .eq('church_id', churchId)
      .eq('assigned_to', profile.id)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(COMPLETED_LIMIT),
  ])

  if (activeRes.error) throw activeRes.error
  if (completedRes.error) throw completedRes.error

  const active = activeRes.data ?? []
  const completed = completedRes.data ?? []

  // Step 2 — purpose-bound contact disclosure. The assignee needs the phone/address
  // of the person they were asked to visit, but member-directory privacy (A5) may hide
  // phone numbers from plain members via app-level gating. We use the admin client
  // ONLY for member_ids that appear on assignments already verified above to belong
  // to the caller (assigned_to = caller AND church_id = caller's church), and only
  // for the fields needed to perform the visit. No other profile is reachable here.
  const memberIds = [...new Set([...active, ...completed].map(a => a.member_id))]
  const membersById = new Map<string, MemberContact>()

  if (memberIds.length > 0) {
    const admin = await createAdminClient()
    const { data: members, error: membersError } = await admin
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, address, address_ar, city, city_ar, address_notes')
      .eq('church_id', churchId)
      .in('id', memberIds)

    if (membersError) throw membersError
    for (const m of (members ?? []) as MemberContact[]) {
      membersById.set(m.id, m)
    }
  }

  const withMember = (a: (typeof active)[number]) => ({
    ...a,
    member: membersById.get(a.member_id) ?? null,
  })

  return {
    active: active.map(withMember),
    completed: completed.map(withMember),
  }
})
