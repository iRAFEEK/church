import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitMutation } from '@/lib/api/rate-limit'

export async function POST(req: NextRequest) {
  const limited = rateLimitMutation(req)
  if (limited) return limited

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { token, deviceHint } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Get user's church_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('church_id')
      .eq('id', user.id)
      .single()

    if (!profile?.church_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Upsert the token — idempotent, safe to call on every app open
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          profile_id: user.id,
          church_id: profile.church_id,
          token,
          device_hint: deviceHint || null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,token' }
      )

    if (error) {
      logger.error('Push token upsert failed', { module: 'push', userId: user.id, churchId: profile.church_id, error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
