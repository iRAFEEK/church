# Ekklesia — Onboarding Model & Build Plan

> The decided model for how **churches** and **members** come onto Ekklesia, and the
> plan to build it. This is the reference every agent/build follows.
> Decided: 2026-06-24 (CEO + engineering). Status: approved, not yet built.

---

## 1. The model (decided)

**Identity** — phone / **WhatsApp OTP** (day one). One human, one login, **deduped by phone**.
*One phone = one person, strictly* (a phone-less person — kid/elder — is a leader-managed record with no phone and never logs in).

**Church onboarding** — **concierge**: a public "request your church" form creates a *pending* church → an operator verifies the requester (we know them in the pilot) → the first `super_admin` is provisioned. Not open self-serve.

**Members — two doors into one lifecycle:**

```
 Door 1: a leader adds you (name + phone)        Door 2: you sign yourself up
        │                                                │
        ▼                                                ▼
   MANAGED (ghost) ──claim via WhatsApp OTP──► ACTIVE ◄──leader approves── PENDING
                                                 │
                                                 └── leader removes / you leave ──► INACTIVE (archived, reversible)
```

- **The rule:** a **pre-added phone = pre-approval** → it auto-claims with no queue. An **unknown phone** → the approval queue. This keeps the queue tiny (the core congregation comes in pre-added).
- **Approvers** of self-sign-ups: `super_admin` + `ministry_leader`.
- **Multi-church:** one identity, many memberships; switch between them (already built). Joining church B uses the same two doors.
- **Directory privacy:** each church configures member phone-number visibility (a church setting).

---

## 2. The structural approach — "claimable shadow identity"

`profiles.id` is a foreign key to `auth.users.id`, so a member profile cannot exist without a login. Rather than decouple them (which would touch every RLS policy — too risky), a **leader-added member is a phone-only auth user** created via `auth.admin.createUser({ phone })` (the same pattern `app/api/visitors/[id]/route.ts` already uses for visitor-convert), with `user_churches.status = 'managed'`. The person **claims** it later via `signInWithOtp({ phone })`, authenticating as that same user. Supabase's global phone-uniqueness gives us **dedupe-by-phone for free**.

---

## 3. What we build (Track A)

| # | Piece | Key changes |
|---|---|---|
| A1 | **WhatsApp OTP auth** | Phone-OTP login/signup (`signInWithOtp`); Supabase phone provider = Twilio WhatsApp; email kept as fallback. Migration: `profiles.phone` unique-when-present + `phone_verified_at`. Phone is a *changeable credential*, not the immutable key (include a "change number" verify flow). |
| A2 | **Membership lifecycle + church approval** | `user_churches.status` (`managed/pending/active/inactive`); church-level request/approve mirroring `group_join_requests` (migration 058) + `notifyChurchJoinRequest()`; approval-queue UI; gate `switch`/access on `status='active'`. |
| A3 | **Leader-add + claim** | "Add member" (name+phone) → shadow identity (`status='managed'`); claim flow (OTP → activate; dedupe if phone exists → add membership). |
| A4 | **Church request → approve** | `churches.status` (`pending/active/inactive`); `register` creates `pending`; operator approval (manual for pilot + a minimal platform-admin screen as fast-follow). |
| A5 | **Per-church directory privacy** | `churches.member_directory_visibility` setting; gate phone rendering in `app/(app)/admin/members/page.tsx` + member APIs; settings UI. |

## 4. Reuse (already built)
`user_churches` (031) · church switcher + `switch` API · `group_join_requests` (058) as the request/approve blueprint · `handle_new_user` trigger (048) · `createAdminClient()` (visitor-convert pattern) · `lib/auth.ts` + `middleware.ts` (auth-method-agnostic) · feature flags.

## 5. How we build it (agents)
Per sub-feature: `ux-designer` (screens) → `database-auditor` (migration review) → `feature-builder`/`coding-agent` (build) → `security-auditor` (IDOR/RLS) → `tests-debt-auditor` + e2e → `code-reviewer`. A `cto-orchestrator` panel runs the P0 security review up front.

## 6. External dependency (start now)
Twilio WhatsApp sender + **Meta Business WhatsApp OTP template approval** (lead time).

## 7. Verification
`npx vitest run` · `npm run test:e2e` (extend `e2e/` with OTP-claim, self-join→approve, leader-add, church-request→approve, directory-privacy) · `npx tsc --noEmit` = 0 · RTL grep = 0 · `npm run verify:schema` after migrations. Manual: pending church → approve → add member by phone → claim via OTP → self-join 2nd church → approve → switch → confirm isolation.
