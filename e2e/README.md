# End-to-End Tests (Playwright)

Full-journey browser tests for the critical paths. Complements the unit/integration
tests (which test pieces in isolation) by driving the real app like a user.

## One-time setup

```bash
npx playwright install chromium    # download the browser
```

## Run

```bash
# Against your local dev server (Playwright will start `npm run dev` for you)
npm run test:e2e

# Against an already-running app (local or a preview URL)
E2E_BASE_URL=http://localhost:3000 npm run test:e2e

# Headed / debug
npm run test:e2e -- --headed
npm run test:e2e -- --debug
```

## What runs with no setup

- **`auth-gating.spec.ts`** — middleware auth gate (unauthenticated → `/login`),
  public pages render. No data required.
- **Finance-is-OFF** (in `critical-paths.spec.ts`) — `/api/finance/*` returns 404.
  The finance gate runs before auth, so this needs no user.
- **`/join` with no church id** (in `visitor-intake.spec.ts`) → redirects to `/login`.

## Data-dependent journeys

The remaining specs need known users/ids in a **disposable test Supabase project** —
never point these at production. They `test.skip()` automatically until the matching
env vars are set, so the suite stays green without them.

| Spec | Covers | Needs |
|---|---|---|
| `critical-paths.spec.ts` | member blocked from admin pages; admin reaches them; finance pages blocked for admin | `E2E_MEMBER_*`, `E2E_ADMIN_*` |
| `onboarding.spec.ts` | incomplete user forced into `/onboarding`; onboarded member reaches `/dashboard` | `E2E_ONBOARDING_*`, `E2E_MEMBER_*` |
| `visitor-intake.spec.ts` | public `/join` form submits → success page | `E2E_CHURCH_ID` |

Provide them via a git-ignored `.env.e2e` (see `.env.e2e.example`) or your shell:

```
E2E_BASE_URL=http://localhost:3000
E2E_MEMBER_EMAIL=member@gracechurch.test
E2E_MEMBER_PASSWORD=password123
E2E_ADMIN_EMAIL=pastor@gracechurch.test
E2E_ADMIN_PASSWORD=password123
E2E_ONBOARDING_EMAIL=newmember@gracechurch.test   # onboarding_completed=false
E2E_ONBOARDING_PASSWORD=password123
E2E_CHURCH_ID=a0000000-0000-0000-0000-000000000001
```

> The values above match `supabase/seed_data.sql` (all test users share the
> password `password123`). Load the file before running:
> `set -a; source .env.e2e; set +a; npm run test:e2e`

The visitor-intake spec creates one visitor named `[E2E] Visitor` per run; clean it
with `DELETE FROM visitors WHERE first_name = '[E2E]';` on the test DB.

## Coverage status

Phase A — access (`persona-matrix.spec.ts`, `critical-paths.spec.ts`):
- [x] Permission/role matrix for all 4 personas (every route, render vs blocked + deep-link probes)
- [x] Finance is OFF (pages redirect, API 404)
- [x] Onboarding gate (incomplete → `/onboarding`)
- [x] Public visitor intake (`/join` → success)

Phase B — member/leader/admin mutations (`member-actions.spec.ts`, `leader-admin-crosschurch.spec.ts`):
- [x] Member: RSVP, serving signup, prayer submit, "I'm praying" (with cleanup)
- [x] Group leader: create gathering + mark attendance
- [x] Admin: publish an announcement

Phase C — cross-church (`leader-admin-crosschurch.spec.ts`):
- [x] Church A posts a need → Church B responds (cross-church) → duplicate correctly 409'd

Journeys (`signup-and-isolation.spec.ts`):
- [x] Onboarding completion: an un-onboarded account is gated into `/onboarding`, completes it, reaches the app
- [x] Two-church data isolation: a church B admin sees **0** church A members (list + deep-linked detail)

> ⚠️ **Launch dependency (not a code bug):** the project's Supabase has **email
> confirmation ON with no custom SMTP**, so the public sign-up form can't complete
> (signup tries to send a rate-limited confirmation email and rejects test
> domains). Wire Resend/SMTP into Supabase Auth — or disable confirmation for the
> pilot — before self-signup works. The onboarding spec therefore drives a
> pre-confirmed user (`E2E_NEWUSER_*`, created via the admin API).

Known minor gap (follow-up, not a leak): a church B admin can POST a gathering
referencing church A's `group_id` (201) — `/api/gatherings` doesn't verify the
group belongs to the caller's church. No cross-church data is readable as a result.
