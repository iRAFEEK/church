import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/role-suggestions — distinct role values for autocomplete
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('event_service_assignments')
    .select('role')
    .eq('church_id', profile.church_id)
    .not('role', 'is', null)
    .limit(500)

  if (error) {
    console.error('[/api/role-suggestions GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const unique = [...new Set((data || []).map((d: any) => d.role).filter(Boolean))]
  return NextResponse.json({ data: unique }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  })
}
