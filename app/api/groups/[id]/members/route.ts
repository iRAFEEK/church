import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { z } from 'zod'

const addGroupMemberSchema = z.object({
  profile_id: z.string().uuid(),
  role_in_group: z.enum(['member', 'leader', 'co_leader']).default('member'),
})

const removeGroupMemberSchema = z.object({
  profile_id: z.string().uuid(),
})

export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const group_id = params?.id
  if (!group_id) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { profile_id, role_in_group } = validate(addGroupMemberSchema, body)

  // Upsert — re-activates if previously removed
  const { data, error } = await supabase
    .from('group_members')
    .upsert({
      group_id,
      profile_id,
      church_id: profile.church_id,
      role_in_group,
      is_active: true,
    }, { onConflict: 'group_id,profile_id' })
    .select()
    .single()

  if (error) {
    console.error('[/api/groups/[id]/members POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_members'] })

export const DELETE = apiHandler(async ({ req, supabase, profile, params }) => {
  const group_id = params?.id
  if (!group_id) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { profile_id } = validate(removeGroupMemberSchema, body)

  // Soft remove
  const { error } = await supabase
    .from('group_members')
    .update({ is_active: false })
    .eq('group_id', group_id)
    .eq('profile_id', profile_id)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('[/api/groups/[id]/members DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (userProfile) revalidateTag(`dashboard-${userProfile.church_id}`)
  return NextResponse.json({ success: true })
}
