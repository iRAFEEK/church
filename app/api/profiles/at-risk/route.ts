import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ARCH: Must fetch profile to get church_id for tenant isolation
  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // ARCH: church_id filter is critical — without it, at-risk profiles from all churches are returned
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone, updated_at, group_members(group_id, group:group_id(id, name, name_ar, leader_id))')
    .eq('church_id', profile.church_id)
    .eq('status', 'at_risk')
    .order('updated_at', { ascending: true })

  if (error) {
    console.error('[/api/profiles/at-risk GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
}
