import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Church, AuthUser, PermissionKey } from '@/types'
import { resolvePermissions, HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'

/**
 * Get the current authenticated user with their profile and church.
 * Use in Server Components. Redirects to /login if not authenticated.
 * Wrapped with React cache() — deduplicated within a single request.
 */
export const getCurrentUserWithRole = cache(async (): Promise<AuthUser> => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Single joined query: profile + church in one round trip
  const { data: profileWithChurch, error: profileError } = await supabase
    .from('profiles')
    .select('*, church:church_id(*)')
    .eq('id', user.id)
    .single()

  if (profileError || !profileWithChurch) {
    redirect('/login')
  }

  const { church: churchData, ...profileData } = profileWithChurch

  if (!churchData) {
    redirect('/login')
  }

  const rawProfile = profileData as Profile

  // SECURITY: Cross-reference role from user_churches (authoritative per-church role)
  // Prevents privilege escalation if profiles.role is stale after church switch
  const { data: membership } = await supabase
    .from('user_churches')
    .select('role')
    .eq('user_id', user.id)
    .eq('church_id', rawProfile.church_id)
    .single()

  const effectiveRole = (membership?.role ?? rawProfile.role) as Profile['role']
  const profile: Profile = { ...rawProfile, role: effectiveRole }

  // Fetch church-level role permission defaults (if configured)
  const { data: roleDefaults } = await supabase
    .from('role_permission_defaults')
    .select('permissions')
    .eq('church_id', profile.church_id)
    .eq('role', effectiveRole)
    .single()

  const resolvedPermissions = resolvePermissions(
    effectiveRole,
    roleDefaults?.permissions ?? null,
    profile.permissions ?? null
  )

  return {
    id: user.id,
    email: user.email!,
    profile,
    church: churchData as unknown as Church,
    resolvedPermissions,
  }
})

/**
 * Get the current user without redirecting.
 * Returns null if not authenticated.
 */
export async function getCurrentUserSafe(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profileWithChurch } = await supabase
      .from('profiles')
      .select('*, church:church_id(*)')
      .eq('id', user.id)
      .single()

    if (!profileWithChurch) return null

    const { church: churchData, ...profileData } = profileWithChurch
    if (!churchData) return null

    const rawProfile = profileData as Profile

    // SECURITY: Cross-reference role from user_churches (authoritative per-church role)
    const { data: membership } = await supabase
      .from('user_churches')
      .select('role')
      .eq('user_id', user.id)
      .eq('church_id', rawProfile.church_id)
      .single()

    const effectiveRole = (membership?.role ?? rawProfile.role) as Profile['role']
    const profile: Profile = { ...rawProfile, role: effectiveRole }

    const { data: roleDefaults } = await supabase
      .from('role_permission_defaults')
      .select('permissions')
      .eq('church_id', profile.church_id)
      .eq('role', effectiveRole)
      .single()

    const resolved = resolvePermissions(
      effectiveRole,
      roleDefaults?.permissions ?? null,
      profile.permissions ?? null
    )

    return {
      id: user.id,
      email: user.email!,
      profile,
      church: churchData as unknown as Church,
      resolvedPermissions: resolved,
    }
  } catch {
    return null
  }
}

/**
 * Sign out the current user and redirect to /login.
 * Use as a Server Action.
 */
export async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Check if the user has the required role.
 */
export function hasRole(profile: Profile, ...roles: Profile['role'][]): boolean {
  return roles.includes(profile.role)
}

/**
 * Check if the user is an admin (ministry_leader or super_admin).
 */
export function isAdmin(profile: Profile): boolean {
  return hasRole(profile, 'ministry_leader', 'super_admin')
}

/**
 * Check if the user is a leader or above.
 */
export function isLeader(profile: Profile): boolean {
  return hasRole(profile, 'group_leader', 'ministry_leader', 'super_admin')
}

/**
 * Server-side route guard. Call at top of admin page Server Components.
 * Redirects to /dashboard if user lacks one of the allowed roles.
 */
export async function requireRole(...allowedRoles: Profile['role'][]): Promise<AuthUser> {
  const user = await getCurrentUserWithRole()
  if (!allowedRoles.includes(user.profile.role)) {
    redirect('/dashboard')
  }
  return user
}

/**
 * Server-side permission guard. Redirects to /dashboard if user lacks ALL specified permissions.
 * Uses the additive permission model: role defaults + church defaults + user overrides.
 */
export async function requirePermission(...permissions: PermissionKey[]): Promise<AuthUser> {
  const user = await getCurrentUserWithRole()
  for (const perm of permissions) {
    if (!user.resolvedPermissions[perm]) {
      redirect('/dashboard')
    }
  }
  return user
}

/**
 * Resolve permissions for an API route profile query.
 * Use when you have a lightweight profile object from an API route (not the full AuthUser).
 * Fetches role defaults and resolves permissions.
 */
export async function resolveApiPermissions(
  supabase: any,
  profile: { role: string; church_id: string; permissions?: any },
  userId?: string
): Promise<Record<PermissionKey, boolean>> {
  // If userId provided, cross-check role from user_churches (defense in depth)
  let effectiveRole = profile.role as Profile['role']
  if (userId) {
    const { data: membership } = await supabase
      .from('user_churches')
      .select('role')
      .eq('user_id', userId)
      .eq('church_id', profile.church_id)
      .single()

    if (membership?.role) {
      effectiveRole = membership.role as Profile['role']
    }
  }

  const { data: roleDefaults } = await supabase
    .from('role_permission_defaults')
    .select('permissions')
    .eq('church_id', profile.church_id)
    .eq('role', effectiveRole)
    .single()

  return resolvePermissions(
    effectiveRole,
    roleDefaults?.permissions ?? null,
    profile.permissions ?? null
  )
}
