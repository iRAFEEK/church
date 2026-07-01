// Shared membership-status helper (onboarding FIX 1). Kept in its own leaf module —
// with no imports and no side effects — so it can be used from both lib/auth.ts and
// lib/api/handler.ts without either importing the other, and so route tests that mock
// '@/lib/auth' wholesale don't accidentally stub it out.

/**
 * Whether a user_churches.status grants app access to that church. Only 'active'
 * members get in. 'managed' (leader-added, not yet claimed via OTP), 'invited'
 * (cross-church invite awaiting consent), and 'inactive' (archived) must NOT reach
 * the app for that church.
 *
 * A missing/undefined status is treated as active: the column is NOT NULL DEFAULT
 * 'active' (migration 082) and every real row is backfilled, so undefined only ever
 * appears from lightweight mocks/tests — failing those open would break auth for
 * genuinely active users. Any *explicit* non-active string denies.
 */
export function isActiveMembership(status: string | null | undefined): boolean {
  return status == null || status === 'active'
}
