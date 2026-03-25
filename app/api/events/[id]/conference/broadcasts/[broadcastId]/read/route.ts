import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'

// POST /api/events/[id]/conference/broadcasts/[broadcastId]/read — upsert read receipt
export const POST = apiHandler(async ({ supabase, user, profile, params }) => {
  const eventId = params!.id
  const broadcastId = params!.broadcastId

  // Verify broadcast belongs to this event + church
  const { data: broadcast } = await supabase
    .from('conference_broadcasts')
    .select('id')
    .eq('id', broadcastId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!broadcast) {
    return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('conference_broadcast_reads')
    .upsert(
      { broadcast_id: broadcastId, profile_id: user.id },
      { onConflict: 'broadcast_id,profile_id', ignoreDuplicates: true }
    )

  if (error) throw error

  return { success: true }
})
