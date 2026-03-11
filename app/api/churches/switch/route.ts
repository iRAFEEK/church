import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { church_id } = body

  if (!church_id) return NextResponse.json({ error: 'church_id is required' }, { status: 400 })

  // Verify user is a member of this church (can only switch to joined churches)
  const { data: membership } = await supabase
    .from('user_churches')
    .select('id')
    .eq('user_id', user.id)
    .eq('church_id', church_id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this church' }, { status: 403 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ church_id })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
