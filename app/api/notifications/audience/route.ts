import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countAudience, type AudienceTarget } from '@/lib/messaging/audience'
import { getSendableScopes, validateTargetsAgainstScopes } from '@/lib/messaging/scopes'

// POST /api/notifications/audience — preview audience count (role-scoped)
export async function POST(req: NextRequest) {
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
  if (!scopes.canSend) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { targets } = (await req.json()) as { targets: AudienceTarget[] }
  if (!targets?.length) {
    return NextResponse.json({ profileCount: 0, visitorCount: 0, total: 0 })
  }

  const validation = validateTargetsAgainstScopes(targets, scopes)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 403 })
  }

  const result = await countAudience(profile.church_id, targets)
  return NextResponse.json(result)
}
