import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'

// POST /api/serving/slots/[id]/signup — sign up for a slot
export const POST = apiHandler(async ({ supabase, user, profile, params }) => {
  const slotId = params!.id

  // Check if already signed up
  const { data: existing } = await supabase
    .from('serving_signups')
    .select('id, status')
    .eq('slot_id', slotId)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)
    .single()

  if (existing && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'Already signed up' }, { status: 409 })
  }

  // Check capacity — also verify slot belongs to this church
  const { data: slot } = await supabase
    .from('serving_slots')
    .select('max_volunteers')
    .eq('id', slotId)
    .eq('church_id', profile.church_id)
    .single()

  if (!slot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (slot.max_volunteers) {
    const { count } = await supabase
      .from('serving_signups')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slotId)
      .eq('church_id', profile.church_id)
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
      .eq('church_id', profile.church_id)
      .select('id, slot_id, profile_id, church_id, status, signed_up_at')
      .single()

    if (error) throw error
    revalidateTag(`dashboard-${profile.church_id}`)
    return { data }
  }

  const { data, error } = await supabase
    .from('serving_signups')
    .insert({
      slot_id: slotId,
      church_id: profile.church_id,
      profile_id: user.id,
    })
    .select('id, slot_id, profile_id, church_id, status, signed_up_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
})

// DELETE /api/serving/slots/[id]/signup — cancel own signup
export const DELETE = apiHandler(async ({ supabase, user, profile, params }) => {
  const slotId = params!.id

  const { data, error } = await supabase
    .from('serving_signups')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('slot_id', slotId)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)
    .neq('status', 'cancelled')
    .select('id')
    .single()

  if (error && error.code === 'PGRST116') {
    return NextResponse.json({ error: 'No active signup found' }, { status: 404 })
  }
  if (error) throw error
  if (!data) return NextResponse.json({ error: 'No active signup found' }, { status: 404 })

  revalidateTag(`dashboard-${profile.church_id}`)
  return { success: true }
})
