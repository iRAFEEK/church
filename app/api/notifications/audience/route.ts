import { apiHandler } from '@/lib/api/handler'
import { countAudience, type AudienceTarget } from '@/lib/messaging/audience'
import { getSendableScopes, validateTargetsAgainstScopes } from '@/lib/messaging/scopes'
import { NextResponse } from 'next/server'

// POST /api/notifications/audience — preview audience count (role-scoped)
export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
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
})
