import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateGatheringSchema } from '@/lib/schemas/gathering'

export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = validate(CreateGatheringSchema, await req.json())

  const { data, error } = await supabase
    .from('gatherings')
    .insert({ ...body, church_id: profile.church_id, created_by: user.id })
    .select('id, group_id, church_id, scheduled_at, status, location, topic, notes, created_by, created_at')
    .single()

  if (error) {
    console.error('[/api/gatherings POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
})
