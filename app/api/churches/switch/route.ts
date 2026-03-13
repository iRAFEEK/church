import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { church_id } = body

  if (!church_id) return NextResponse.json({ error: 'church_id is required' }, { status: 400 })

  // Read the user's role for the TARGET church from user_churches
  // This is the authoritative source of per-church roles
  const { data: membership } = await supabase
    .from('user_churches')
    .select('role')
    .eq('user_id', user.id)
    .eq('church_id', church_id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this church' }, { status: 403 })
  }

  // CRITICAL: Update BOTH church_id AND role atomically
  // This prevents privilege escalation where a super_admin at Church A
  // retains that role when switching to Church B where they are just a member
  const { error } = await supabase
    .from('profiles')
    .update({
      church_id,
      role: membership.role,
    })
    .eq('id', user.id)

  if (error) {
    console.error('[/api/churches/switch POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
