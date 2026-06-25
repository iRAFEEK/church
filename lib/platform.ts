/**
 * Platform-level (super-super) admin gating.
 *
 * Ekklesia's normal roles are per-church. A *platform* admin (the people running the
 * SaaS) is identified purely by email, configured out-of-band via the
 * PLATFORM_ADMIN_EMAILS env var (comma-separated). This deliberately sits outside the
 * church RBAC system — a platform admin approves brand-new churches they aren't a
 * member of.
 */
export function isPlatformAdmin(email?: string | null): boolean {
  if (!email) return false

  const allowList = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (allowList.length === 0) return false

  return allowList.includes(email.trim().toLowerCase())
}
