import { createClient } from '@/lib/supabase/server'
import type { AudienceTarget } from './audience'

export type AudienceTargetType = 'all_church' | 'roles' | 'groups' | 'ministries' | 'statuses' | 'visitors' | 'gender'

export interface SendableScopes {
  role: string
  allowedTargetTypes: AudienceTargetType[]
  ministryIds: string[]
  groupIds: string[]
  canSend: boolean
  isUnscoped: boolean // true for super_admin (no restrictions)
}

const NO_SEND: SendableScopes = {
  role: 'member',
  allowedTargetTypes: [],
  ministryIds: [],
  groupIds: [],
  canSend: false,
  isUnscoped: false,
}

/**
 * Determines what audience targets a user is allowed to send notifications to,
 * based on their role and leadership assignments.
 */
export async function getSendableScopes(
  userId: string,
  churchId: string,
  role: string
): Promise<SendableScopes> {
  if (role === 'member') return { ...NO_SEND, role }

  if (role === 'super_admin') {
    return {
      role,
      allowedTargetTypes: ['all_church', 'roles', 'groups', 'ministries', 'statuses', 'visitors', 'gender'],
      ministryIds: [],
      groupIds: [],
      canSend: true,
      isUnscoped: true,
    }
  }

  const supabase = await createClient()

  if (role === 'ministry_leader') {
    // Check both ministry_members (role_in_ministry='leader') and ministries.leader_id
    const [{ data: ledViaMembers }, { data: ledViaOwnership }] = await Promise.all([
      supabase
        .from('ministry_members')
        .select('ministry_id')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .eq('role_in_ministry', 'leader'),
      supabase
        .from('ministries')
        .select('id')
        .eq('church_id', churchId)
        .eq('leader_id', userId)
        .eq('is_active', true),
    ])

    const ministryIdSet = new Set<string>()
    ledViaMembers?.forEach(m => ministryIdSet.add(m.ministry_id))
    ledViaOwnership?.forEach(m => ministryIdSet.add(m.id))
    const ministryIds = Array.from(ministryIdSet)

    if (ministryIds.length === 0) return { ...NO_SEND, role }

    // Get groups belonging to those ministries
    const { data: ministryGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('ministry_id', ministryIds)

    return {
      role,
      allowedTargetTypes: ['ministries', 'groups'],
      ministryIds,
      groupIds: ministryGroups?.map(g => g.id) || [],
      canSend: true,
      isUnscoped: false,
    }
  }

  if (role === 'group_leader') {
    // Check groups.leader_id and groups.co_leader_id
    const { data: ledGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .or(`leader_id.eq.${userId},co_leader_id.eq.${userId}`)

    const groupIds = ledGroups?.map(g => g.id) || []
    if (groupIds.length === 0) return { ...NO_SEND, role }

    return {
      role,
      allowedTargetTypes: ['groups'],
      ministryIds: [],
      groupIds,
      canSend: true,
      isUnscoped: false,
    }
  }

  return { ...NO_SEND, role }
}

/**
 * Validates that a set of audience targets is within the user's allowed scope.
 */
export function validateTargetsAgainstScopes(
  targets: AudienceTarget[],
  scopes: SendableScopes
): { valid: boolean; error?: string } {
  if (!scopes.canSend) {
    return { valid: false, error: 'You do not have permission to send notifications' }
  }

  if (scopes.isUnscoped) {
    return { valid: true }
  }

  for (const target of targets) {
    if (!scopes.allowedTargetTypes.includes(target.type as AudienceTargetType)) {
      return { valid: false, error: `You cannot target by "${target.type}"` }
    }

    if (target.type === 'ministries' && target.ministryIds?.length) {
      const outOfScope = target.ministryIds.filter(id => !scopes.ministryIds.includes(id))
      if (outOfScope.length > 0) {
        return { valid: false, error: 'You can only send to ministries you lead' }
      }
    }

    if (target.type === 'groups' && target.groupIds?.length) {
      const outOfScope = target.groupIds.filter(id => !scopes.groupIds.includes(id))
      if (outOfScope.length > 0) {
        return { valid: false, error: 'You can only send to groups you lead' }
      }
    }
  }

  return { valid: true }
}
