import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'

// POST /api/churches/switch — switch active church
export const POST = apiHandler(async ({ req, supabase, user }) => {
  const body = await req.json()
  const { church_id } = body

  if (!church_id) {
    return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
  }

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

  if (error) throw error

  return { success: true }
}, { rateLimit: 'strict' })
