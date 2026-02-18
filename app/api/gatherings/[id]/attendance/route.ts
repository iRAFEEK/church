import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// POST: bulk upsert attendance records
export async function POST(req: NextRequest, { params }: Params) {
  const { id: gathering_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { records } = await req.json()
  // records: Array<{ profile_id: string, status: AttendanceStatus, excuse_reason?: string }>

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'records array required' }, { status: 400 })
  }

  // Get gathering to pull group_id and church_id
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gathering_id)
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
