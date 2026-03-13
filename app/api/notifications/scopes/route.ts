import { apiHandler } from '@/lib/api/handler'
import { getSendableScopes } from '@/lib/messaging/scopes'
import { NextResponse } from 'next/server'

// GET /api/notifications/scopes — returns what audience targets the current user can send to
export const GET = apiHandler(async ({ supabase, profile, user }) => {
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
})
