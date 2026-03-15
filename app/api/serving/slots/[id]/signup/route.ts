import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'

// POST /api/serving/slots/[id]/signup — sign up for a slot
// DB-4 fix: uses atomic Postgres function with SELECT FOR UPDATE to prevent
// race conditions on capacity checks and duplicate signups
export const POST = apiHandler(async ({ supabase, user, profile, params }) => {
  const slotId = params!.id

  const { data: result, error } = await supabase
    .rpc('signup_for_serving_slot', {
      p_slot_id: slotId,
      p_profile_id: user.id,
      p_church_id: profile.church_id,
    })

  if (error) throw error

  const parsed = result as { error?: string; status: number; data?: Record<string, unknown> }

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data: parsed.data }, { status: parsed.status })
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
