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
  | 'finance'
  | 'templates'

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  advanced_reporting: false,
  sms_notifications: false,
  api_access: false,
  custom_fields: false,
  audit_log_ui: false,
  outreach_module: true,
  song_presenter: true,
  liturgy_module: true,
  // Finance is OFF until the module is production-ready. The whole surface
  // (nav, pages, /finance/my-giving, and all /api/finance/* routes) is gated
  // in middleware + navigation via the SYNCHRONOUS global check isFeatureEnabled()
  // — which only reads this default + the NEXT_PUBLIC_FEATURE_FINANCE env override.
  // It does NOT consult the church_features table, so a per-church row CANNOT make
  // finance reachable today: the only way to turn it on is NEXT_PUBLIC_FEATURE_FINANCE=true
  // (global). Per-church enablement would require rewiring the gate to the async
  // isFeatureEnabledForChurch() check first.
  finance: false,
  // Event templates are OFF in production until the module is pilot-ready.
  // The whole surface (nav, /admin/templates*, /admin/events/from-template,
  // /api/templates*, /api/events/from-template) is gated in middleware +
  // navigation, mirroring the finance gate. Re-enable with
  // NEXT_PUBLIC_FEATURE_TEMPLATES=true (set on staging/local).
  templates: false,
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
