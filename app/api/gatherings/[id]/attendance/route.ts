import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { BulkAttendanceSchema } from '@/lib/schemas/gathering'
import { NextResponse } from 'next/server'

// POST: bulk upsert attendance records
export const POST = apiHandler(async ({ req, supabase, profile, user, params }) => {
  const gathering_id = params?.id
  if (!gathering_id) return Response.json({ error: 'Not found' }, { status: 404 })

  const { records } = validate(BulkAttendanceSchema, await req.json())

  // Get gathering to pull group_id and church_id — verify church_id matches
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gathering_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!gathering) return NextResponse.json({ error: 'Gathering not found' }, { status: 404 })

  const rows = records.map((r) => ({
    gathering_id,
    group_id: gathering.group_id,
    church_id: gathering.church_id,
    profile_id: r.profile_id,
    status: r.status,
    excuse_reason: r.excuse_reason || null,
    marked_by: user.id,
    marked_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'gathering_id,profile_id' })
    .select('id, gathering_id, group_id, church_id, profile_id, status, excuse_reason, marked_by, marked_at')

  if (error) {
    console.error('[/api/gatherings/[id]/attendance POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${gathering.church_id}`)
  return { data }
})
