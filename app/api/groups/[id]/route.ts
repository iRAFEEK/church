import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
import { validate } from '@/lib/api/validate'
import { UpdateGroupSchema } from '@/lib/schemas/group'
import { canCallerViewMemberPhones } from '@/lib/members/visibility'

export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('groups')
    .select(`
      id, church_id, ministry_id, name, name_ar, type, leader_id, co_leader_id,
      meeting_day, meeting_time, meeting_location, meeting_location_ar, meeting_frequency,
      max_members, is_open, is_active, created_at, updated_at,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,email),
      co_leader:co_leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url),
      group_members(
        id, role_in_group, joined_at, is_active,
        profile:profile_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,status)
      )
    `)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    logger.error('[/api/groups/[id] GET]', { module: 'groups', error })
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Member-directory privacy (A5, church-wide): strip member phone (leader + members)
  // unless the caller's role is allowed by the church's visibility setting.
  const canSeePhone = await canCallerViewMemberPhones(supabase, profile.church_id, profile.role)
  const gated =
    canSeePhone || !data
      ? data
      : {
          ...data,
          leader: data.leader
            ? { ...(data.leader as unknown as Record<string, unknown>), phone: null }
            : data.leader,
          group_members: ((data.group_members ?? []) as unknown as Array<Record<string, unknown>>).map(
            (gm) => {
              const prof = gm.profile as Record<string, unknown> | null
              return prof ? { ...gm, profile: { ...prof, phone: null } } : gm
            }
          ),
        }

  return NextResponse.json({ data: gated })
})

export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const validated = validate(UpdateGroupSchema, body)

  const { data, error } = await supabase
    .from('groups')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, church_id, ministry_id, name, name_ar, type, leader_id, co_leader_id, meeting_day, meeting_time, meeting_location, meeting_location_ar, meeting_frequency, max_members, is_open, is_active, created_at, updated_at')
    .single()

  if (error) {
    logger.error('[/api/groups/[id] PATCH]', { module: 'groups', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${data.church_id}`)
  revalidateTag(`groups-${data.church_id}`)
  return NextResponse.json({ data })
})

export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params?.id
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft delete
  const { data, error } = await supabase.from('groups').update({ is_active: false }).eq('id', id).eq('church_id', profile.church_id).select('church_id').single()
  if (error) {
    logger.error('[/api/groups/[id] DELETE]', { module: 'groups', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (data) revalidateTag(`dashboard-${data.church_id}`)
  return NextResponse.json({ success: true })
})
