import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { NextResponse } from 'next/server'

// POST: bulk upsert attendance records
export const POST = apiHandler(async ({ req, supabase, profile, user, params }) => {
  const gathering_id = params?.id
  if (!gathering_id) return Response.json({ error: 'Not found' }, { status: 404 })

  const { records } = await req.json()
  // records: Array<{ profile_id: string, status: AttendanceStatus, excuse_reason?: string }>

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'records array required' }, { status: 400 })
  }

  // Get gathering to pull group_id and church_id — verify church_id matches
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gathering_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!gathering) return NextResponse.json({ error: 'Gathering not found' }, { status: 404 })

  const rows = records.map((r: { profile_id: string; status: string; excuse_reason?: string }) => ({
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
    .select()

  if (error) {
    console.error('[/api/gatherings/[id]/attendance POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${gathering.church_id}`)
  return { data }
})
