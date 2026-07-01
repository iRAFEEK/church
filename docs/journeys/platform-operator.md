# Journey: Platform Operator (Ekklesia Concierge / SaaS Operator)

> Derived from source. Key files cited inline. This is **not a church role.** It sits
> entirely outside the per-church RBAC system and is gated only by an email allowlist.

---

## 1. Who they are

The **platform operator** is one of the people running the Ekklesia SaaS — the
concierge who approves brand-new churches during onboarding. Ekklesia's normal roles
(`super_admin`, `ministry_leader`, `group_leader`, `member`) are **per-church**; a
platform operator "deliberately sits outside the church RBAC system — a platform admin
approves brand-new churches they aren't a member of" (`lib/platform.ts:6-9`).

Identity is by **email allowlist only**, configured out-of-band via the
`PLATFORM_ADMIN_EMAILS` env var (comma-separated). `isPlatformAdmin(email)`:
- returns `false` for a missing email (`lib/platform.ts:11`),
- parses/normalizes the allowlist (trim + lowercase),
- **returns `false` when the allowlist is empty — i.e. empty list = deny-all**
  (`lib/platform.ts:18`),
- otherwise membership is a case-insensitive exact match (`:20`).

This is a **secret-tier capability.** Per `OPERATIONS_RUNBOOK.md:51-56`:
`PLATFORM_ADMIN_EMAILS` is "secret-tier config, not just a setting… the *entire* gate
for who can approve/reject churches across all tenants. Anyone who can edit this Vercel
env var can grant themselves cross-church approval power." It must be kept to the
minimum trusted operator emails, set in Production scope only, treated like a key
rotation on change, and **the emails must be verified Supabase auth accounts.**

---

## 2. What they CAN do

Everything is scoped to **church status transitions**, not tenant data.

### See pending church registrations
`/platform/churches` (`app/(app)/platform/churches/page.tsx`):
- First calls `getCurrentUserWithRole()` and `isPlatformAdmin(email)`; a non-operator
  is redirected to `/dashboard` (`:15-18`).
- Uses the **service-role admin client** — pending churches have no member
  relationship to the operator, so RLS would otherwise hide them (`:21-27`).
- Lists churches where `status = 'pending'`, ordered oldest-first, limited to 100,
  selecting only `id, name, name_ar, country, created_at, pending_contact_name,
  pending_contact_email, pending_contact_phone` (`:24-27`).
- Renders review cards via `PendingChurchList`.

> Note: this screen has no nav entry — the sidebar/bottom-nav is role-based and can't
> be gated by email, so operators reach it by **direct URL** (`page.tsx:11-13`).

### Approve or reject a church
`PATCH /api/platform/churches` (`app/api/platform/churches/route.ts`):
- Runs inside `apiHandler` so the caller is a **verified authenticated user** first,
  then re-checks `isPlatformAdmin(user.email)` → 403 if not (`:17-20`).
- Validates `{ church_id: uuid, action: 'approve' | 'reject' }` (`:9-12, 22`).
- Uses the service-role client (operator isn't a member of the pending church, `:24-26`).
- **Approve** → `{ status: 'active', is_active: true }` — the church goes live and its
  pastor gets access (`:28-31`).
- **Reject** → `{ status: 'rejected', is_active: false }` — kept for audit, not deleted.
- The update is **scoped to `status = 'pending'`** (`:37`) — you can only transition a
  church that is currently pending; already-reviewed churches return 404 "Church not
  found or already reviewed" (`:41-44`).

The status lifecycle itself is defined in migration 079
(`supabase/migrations/079_church_status.sql`): `churches.status` is `pending | active |
rejected | inactive`, defaulting to `active` for existing churches. See also the
`CLAUDE.md` change-log entry for Track A4 (2026-06-25).

---

## 3. What they CANNOT do

- **This is NOT full cross-church data access.** The service-role client is used
  narrowly to read the pending queue and flip church status — the route touches only
  the `churches` table's status fields (`app/api/platform/churches/route.ts:33-39`).
  It does not read or write members, finance, groups, or any tenant content.
- **Not a super_admin of any church.** Being on the allowlist grants zero per-church
  RBAC permissions. The operator is not a member of the pending church at all
  (`lib/platform.ts:6-9`); to operate *inside* a church they would need an actual
  `user_churches` membership + role.
- **Cannot transition non-pending churches.** The `.eq('status', 'pending')` filter
  means approve/reject only apply to churches awaiting review
  (`app/api/platform/churches/route.ts:37`).

---

## 4. Journey (concierge onboarding)

1. **Pastor requests a church** — a pastor completes the registration wizard
   (reachable at `/welcome`). Registration creates a **pending** church:
   `status = 'pending'`, `is_active = false`, with `pending_contact_*` details
   captured (migration 079; `CLAUDE.md` A4 entry). The pending church is hidden from
   member search/join and the pastor sees an "under review" screen.
2. **Operator opens the queue** — operator navigates directly to `/platform/churches`.
   The email gate passes (`isPlatformAdmin`), and the service-role client loads all
   pending churches.
3. **Review** — operator reviews each church's contact info
   (`pending_contact_name / _email / _phone`) shown on the review card.
4. **Approve** — `PATCH /api/platform/churches` with `action: 'approve'` →
   `status = 'active', is_active = true`. The church goes live; its pastor/admin now
   has access and it becomes visible for members to join.
5. **Reject path** — `action: 'reject'` → `status = 'rejected', is_active = false`.
   The record is retained for audit rather than deleted.

---

## 5. Edge cases & security

- **Allowlist is secret-tier — treat it like a key.** Whoever can edit
  `PLATFORM_ADMIN_EMAILS` in Vercel can grant themselves cross-tenant approval power.
  Set it in Production scope only, keep it minimal, and review env access on change
  (`OPERATIONS_RUNBOOK.md:51-56`).
- **Emails must be verified Supabase accounts.** The gate matches on the authenticated
  user's email (`user.email` in the route, `email` from `getCurrentUserWithRole` on the
  page). An allowlisted address that isn't a real logged-in Supabase account can't
  reach the screen (`apiHandler` requires a valid session before the platform check).
- **Empty allowlist = deny-all.** If `PLATFORM_ADMIN_EMAILS` is unset/blank, no one is
  a platform operator (`lib/platform.ts:18`) — fails closed.
- **Pending churches are hidden.** `is_active = false` keeps a pending church out of
  member search/join, and RLS hides it from any normal (non-service-role) client — which
  is exactly why both the page and the API use the service-role admin client
  (`app/(app)/platform/churches/page.tsx:21-22`,
  `app/api/platform/churches/route.ts:24-26`).
- **Idempotent transitions.** Because approve/reject are scoped to `status = 'pending'`,
  re-submitting on an already-reviewed church safely returns 404 rather than
  double-processing (`app/api/platform/churches/route.ts:37, 41-44`).
