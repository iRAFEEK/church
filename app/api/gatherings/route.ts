import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
import { validate } from '@/lib/api/validate'
import { CreateGatheringSchema } from '@/lib/schemas/gathering'

export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = validate(CreateGatheringSchema, await req.json())

  // Verify the target group belongs to this church — never create a gathering
  // against another tenant's group_id (mirrors gatherings/[id]/attendance).
  const { data: grp } = await supabase
    .from('groups')
    .select('id')
    .eq('id', body.group_id)
    .eq('church_id', profile.church_id)
    .single()
  if (!grp) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('gatherings')
    .insert({ ...body, church_id: profile.church_id, created_by: user.id })
    .select('id, group_id, church_id, scheduled_at, status, location, topic, notes, created_by, created_at')
    .single()

  if (error) {
    logger.error('[/api/gatherings POST]', { module: 'gatherings', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
})
