// ARCH: Canonical example of the apiHandler pattern.
// BEFORE: 55 lines with inline auth, no validation, no permission check on POST.
// AFTER: Clean handler with auth, permissions, validation, and timing built in.

import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateGroupSchema } from '@/lib/schemas/group'

export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const ministry_id = searchParams.get('ministry_id')
  const type = searchParams.get('type')

  let query = supabase
    .from('groups')
    .select(`
      id, name, name_ar, type, is_active, is_open,
      meeting_day, meeting_frequency, max_members, church_id,
      ministry_id, leader_id, co_leader_id,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone),
      co_leader:co_leader_id(id,first_name,last_name,first_name_ar,last_name_ar),
      member_count:group_members(count)
    `)
    .eq('church_id', profile.church_id)
    .order('name')

  if (ministry_id) query = query.eq('ministry_id', ministry_id)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return { data }
})

export const POST = apiHandler(async ({ supabase, profile, req }) => {
  const body = await req.json()
  const validated = validate(CreateGroupSchema, body)

  const { data, error } = await supabase
    .from('groups')
    .insert({ ...validated, church_id: profile.church_id })
    .select()
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_members'] })
