# End-to-End Tests (Playwright)

Full-journey browser tests for the critical paths. Complements the 972 unit/integration
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

## What runs out of the box

`auth-gating.spec.ts` needs **no data** — it verifies the middleware auth gate
(unauthenticated → `/login`) and that public pages render. Safe to run anywhere.

## Data-dependent journeys

`critical-paths.spec.ts` (sign-up, giving, permission enforcement) needs known test
users in a **disposable test Supabase project** — never point these at production.

1. Create/seed a test project and two users:
   - a `member`-role user
   - a `super_admin`-role user
   (The repo's `supabase/migrations/003_seed_test_data.sql` + finance seeds are a starting point.)
2. Provide their credentials via env (e.g. a local `.env.e2e`, git-ignored):
   ```
   E2E_BASE_URL=http://localhost:3000
   E2E_MEMBER_EMAIL=member@test.local
   E2E_MEMBER_PASSWORD=...
   E2E_ADMIN_EMAIL=admin@test.local
   E2E_ADMIN_PASSWORD=...
   ```
3. Run. The specs un-skip automatically when the vars are present.

## Next specs to add before launch

- [ ] Full sign-up → onboarding → dashboard
- [ ] Admin records a donation → it appears in reports → member sees it in My Giving
- [ ] Visitor QR intake (`/join`) → appears in the visitor pipeline
- [ ] Two-church isolation: user A cannot see church B's data
