import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string; needId: string; assignmentId: string }> }

// PATCH — update assignment status (confirm/decline)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status } = body

  if (!status || !['confirmed', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'status must be "confirmed" or "declined"' }, { status: 400 })
  }

  const { data: assignment, error } = await supabase
    .from('event_service_assignments')
    .update({
      status,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: assignment })
}
