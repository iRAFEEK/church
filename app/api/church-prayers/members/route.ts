import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET — Search church members for prayer assignment
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_prayers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''

  let dbClient: any
  try {
    dbClient = await createAdminClient()
  } catch {
    dbClient = supabase
  }

  let query = dbClient
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email')
    .eq('church_id', profile.church_id)
    .order('first_name_ar')
    .order('first_name')
    .limit(200)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}
