import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/serving/slots/[id]/signup — sign up for a slot
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Check if already signed up
  const { data: existing } = await supabase
    .from('serving_signups')
    .select('id, status')
    .eq('slot_id', slotId)
    .eq('profile_id', user.id)
    .single()

  if (existing && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'Already signed up' }, { status: 409 })
  }

  // Check capacity
  const { data: slot } = await supabase
    .from('serving_slots')
    .select('max_volunteers')
    .eq('id', slotId)
    .single()

  if (slot?.max_volunteers) {
    const { count } = await supabase
      .from('serving_signups')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slotId)
      .neq('status', 'cancelled')

    if ((count || 0) >= slot.max_volunteers) {
      return NextResponse.json({ error: 'Slot is full' }, { status: 409 })
    }
  }

  // If previously cancelled, re-activate
  if (existing && existing.status === 'cancelled') {
    const { data, error } = await supabase
      .from('serving_signups')
      .update({ status: 'signed_up', signed_up_at: new Date().toISOString(), cancelled_at: null })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 200 })
  }

  const { data, error } = await supabase
    .from('serving_signups')
    .insert({
      slot_id: slotId,
      church_id: profile.church_id,
      profile_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/serving/slots/[id]/signup — cancel own signup
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('serving_signups')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('slot_id', slotId)
    .eq('profile_id', user.id)
    .neq('status', 'cancelled')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No active signup found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
