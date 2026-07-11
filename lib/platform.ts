/**
 * Platform-level (super-super) admin gating.
 *
 * Ekklesia's normal roles are per-church. A *platform* admin (the people running the
 * SaaS) approves brand-new churches they aren't a member of. They are identified purely
 * by email, from two sources:
 *   1. PLATFORM_ADMIN_EMAILS env var (comma-separated) — the BOOTSTRAP owner. Configured
 *      out-of-band, un-removable via UI, so the founder can never be locked out.
 *   2. the `platform_admins` table (migration 087) — approvers added at runtime from the
 *      Ekklesia admin UI. Read via the service-role client (RLS denies normal clients).
 *
 * This deliberately sits outside the church RBAC system.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

function envAllowList(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Env bootstrap owners only — used to protect them from removal in the manage-approvers UI. */
export function isEnvPlatformAdmin(email?: string | null): boolean {
  if (!email) return false
  return envAllowList().includes(email.trim().toLowerCase())
}

/** True if the email is a platform operator via the env bootstrap OR the platform_admins table. */
export async function isPlatformAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false
  const normalized = email.trim().toLowerCase()

  if (envAllowList().includes(normalized)) return true

  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('platform_admins')
      .select('email')
      .eq('email', normalized)
      .maybeSingle()
    return !!data
  } catch (err) {
    logger.error('isPlatformAdmin table lookup failed', { module: 'platform', error: err })
    return false
  }
}
