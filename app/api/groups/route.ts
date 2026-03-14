// ARCH: Canonical example of the apiHandler pattern.
// BEFORE: 55 lines with inline auth, no validation, no permission check on POST.
// AFTER: Clean handler with auth, permissions, validation, and timing built in.

import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateGroupSchema } from '@/lib/schemas/group'
import { normalizeSearch } from '@/lib/utils/normalize'

export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const ministry_id = searchParams.get('ministry_id')
  const type = searchParams.get('type')
  const q = searchParams.get('q')?.trim()

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
    .limit(200)

  if (ministry_id) query = query.eq('ministry_id', ministry_id)
  if (type) query = query.eq('type', type)
  if (q) {
    const normalized = normalizeSearch(q)
    const parts = [`name.ilike.%${q}%`, `name_ar.ilike.%${q}%`]
    if (normalized !== q) {
      parts.push(`name.ilike.%${normalized}%`, `name_ar.ilike.%${normalized}%`)
    }
    query = query.or(parts.join(','))
  }

  const { data, error } = await query
  if (error) throw error
  return { data }
}, { cache: 'private, max-age=60, stale-while-revalidate=300' })

export const POST = apiHandler(async ({ supabase, profile, req }) => {
  const body = await req.json()
  const validated = validate(CreateGroupSchema, body)

  const { data, error } = await supabase
    .from('groups')
    .insert({ ...validated, church_id: profile.church_id })
    .select('id, church_id, ministry_id, name, name_ar, type, leader_id, co_leader_id, meeting_day, meeting_time, meeting_frequency, max_members, is_open, is_active, created_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  revalidateTag(`groups-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_members'] })
