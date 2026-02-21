import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Church, AuthUser } from '@/types'

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

  return {
    id: user.id,
    email: user.email!,
    profile: profileData as Profile,
    church: churchData as unknown as Church,
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

    return {
      id: user.id,
      email: user.email!,
      profile: profileData as Profile,
      church: churchData as unknown as Church,
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
