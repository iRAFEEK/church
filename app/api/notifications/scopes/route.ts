import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSendableScopes } from '@/lib/messaging/scopes'

// GET /api/notifications/scopes — returns what audience targets the current user can send to
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const scopes = await getSendableScopes(user.id, profile.church_id, profile.role)

  // For scoped users, also return display names for their ministries/groups
  let ministries: { id: string; name: string; name_ar: string | null }[] = []
  let groups: { id: string; name: string; name_ar: string | null }[] = []

  if (scopes.canSend && !scopes.isUnscoped) {
    if (scopes.ministryIds.length > 0) {
      const { data } = await supabase
        .from('ministries')
        .select('id, name, name_ar')
        .in('id', scopes.ministryIds)
      ministries = data || []
    }

    if (scopes.groupIds.length > 0) {
      const { data } = await supabase
        .from('groups')
        .select('id, name, name_ar')
        .in('id', scopes.groupIds)
      groups = data || []
    }
  }

  return NextResponse.json({ ...scopes, ministries, groups })
}
