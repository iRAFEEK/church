// ARCH: Feature flag system. Supports per-church feature toggles.
// In production, flags are read from the church_features table.
// In development, flags can be overridden via environment variables.

import type { SupabaseClient } from '@supabase/supabase-js'

export type FeatureFlag =
  | 'advanced_reporting'
  | 'sms_notifications'
  | 'api_access'
  | 'custom_fields'
  | 'audit_log_ui'
  | 'outreach_module'
  | 'song_presenter'
  | 'liturgy_module'

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  advanced_reporting: false,
  sms_notifications: false,
  api_access: false,
  custom_fields: false,
  audit_log_ui: false,
  outreach_module: true,
  song_presenter: true,
  liturgy_module: true,
}

// ARCH: Synchronous check against defaults + env overrides.
// For DB-backed flags, use isFeatureEnabledAsync with supabase client.
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`
  if (typeof process !== 'undefined' && process.env[envKey] === 'true') return true
  if (typeof process !== 'undefined' && process.env[envKey] === 'false') return false
  return DEFAULT_FLAGS[flag]
}

// ARCH: Async check against church_features table.
// Use this when you need per-church feature control.
export async function isFeatureEnabledForChurch(
  // Structural type to accept both real SupabaseClient and test mocks
  supabase: Pick<SupabaseClient, 'from'>,
  flag: FeatureFlag,
  churchId: string
): Promise<boolean> {
  // Check env override first
  if (isFeatureEnabled(flag) && DEFAULT_FLAGS[flag]) return true

  try {
    const { data } = await supabase
      .from('church_features')
      .select('enabled')
      .eq('church_id', churchId)
      .eq('feature', flag)
      .single()

    return data?.enabled ?? DEFAULT_FLAGS[flag]
  } catch {
    return DEFAULT_FLAGS[flag]
  }
}
