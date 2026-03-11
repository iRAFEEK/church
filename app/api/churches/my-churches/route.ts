import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the user's active church_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  // Fetch all memberships with church details
  const { data, error } = await supabase
    .from('user_churches')
    .select('id, user_id, church_id, role, joined_at, church:church_id(id, name, name_ar, logo_url, country)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((row) => ({
    ...row,
    is_active: row.church_id === profile?.church_id,
  }))

  // Sort: active church first
  result.sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))

  return NextResponse.json(result)
}
