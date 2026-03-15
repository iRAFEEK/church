import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/church-prayers/[id]/pray — toggle "I'm praying" on
export const POST = apiHandler(async ({ supabase, user, profile, params }) => {
  const prayerRequestId = params!.id

  // Use admin client to bypass RLS
  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  // Verify the prayer request exists and belongs to this church
  const { data: prayer } = await dbClient
    .from('prayer_requests')
    .select('id')
    .eq('id', prayerRequestId)
    .eq('church_id', profile.church_id)
    .is('group_id', null)
    .single()

  if (!prayer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Upsert — idempotent: if already praying, this is a no-op via ON CONFLICT
  const { error: insertError } = await dbClient
    .from('prayer_responses')
    .upsert(
      {
        prayer_request_id: prayerRequestId,
        profile_id: user.id,
        church_id: profile.church_id,
      },
      { onConflict: 'prayer_request_id,profile_id' }
    )

  if (insertError) throw insertError

  // Get updated count
  const { count } = await dbClient
    .from('prayer_responses')
    .select('id', { count: 'exact', head: true })
    .eq('prayer_request_id', prayerRequestId)

  return { praying: true, count: count ?? 0 }
})

// DELETE /api/church-prayers/[id]/pray — remove "I'm praying"
export const DELETE = apiHandler(async ({ supabase, user, profile, params }) => {
  const prayerRequestId = params!.id

  // Use admin client to bypass RLS
  let dbClient: Awaited<ReturnType<typeof createAdminClient>> | typeof supabase
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  const { error: deleteError } = await dbClient
    .from('prayer_responses')
    .delete()
    .eq('prayer_request_id', prayerRequestId)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)

  if (deleteError) throw deleteError

  // Get updated count
  const { count } = await dbClient
    .from('prayer_responses')
    .select('id', { count: 'exact', head: true })
    .eq('prayer_request_id', prayerRequestId)

  return { praying: false, count: count ?? 0 }
})
