import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { church_id } = body

  if (!church_id) return NextResponse.json({ error: 'church_id is required' }, { status: 400 })

  // Verify target church exists and is active
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id')
    .eq('id', church_id)
    .eq('is_active', true)
    .single()

  if (churchError || !church) {
    return NextResponse.json({ error: 'Church not found' }, { status: 404 })
  }

  // Check if this is during onboarding (first join) or a subsequent join
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (!profile.onboarding_completed) {
    // During onboarding: clear any auto-assigned seed church from user_churches
    // then insert the real church
    await supabase
      .from('user_churches')
      .delete()
      .eq('user_id', user.id)

    const { error: insertError } = await supabase
      .from('user_churches')
      .insert({ user_id: user.id, church_id, role: 'member' })

    if (insertError) {
      console.error('[/api/churches/join POST]', insertError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Set as active church on profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ church_id })
      .eq('id', user.id)

    if (profileError) {
      console.error('[/api/churches/join POST]', profileError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  } else {
    // Subsequent join: just add to user_churches (don't change active church)
    const { error: insertError } = await supabase
      .from('user_churches')
      .insert({ user_id: user.id, church_id, role: 'member' })

    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('[/api/churches/join POST]', insertError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
