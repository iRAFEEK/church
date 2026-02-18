import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, Church, AuthUser } from '@/types'

/**
 * Get the current authenticated user with their profile and church.
 * Use in Server Components. Redirects to /login if not authenticated.
 */
export async function getCurrentUserWithRole(): Promise<AuthUser> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('*')
    .eq('id', profile.church_id)
    .single()

  if (churchError || !church) {
    redirect('/login')
  }

  return {
    id: user.id,
    email: user.email!,
    profile: profile as Profile,
    church: church as Church,
  }
}

/**
 * Get the current user without redirecting.
 * Returns null if not authenticated.
 */
export async function getCurrentUserSafe(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    const { data: church } = await supabase
      .from('churches')
      .select('*')
      .eq('id', profile.church_id)
      .single()

    if (!church) return null

    return {
      id: user.id,
      email: user.email!,
      profile: profile as Profile,
      church: church as Church,
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
