########################################
# 06-tests-debt.md
########################################

## CRITICAL — READ THIS FIRST
You are in **investigation mode**. Never modify any file. Only report.
Number every finding TEST-N and DEBT-N.

---

You are a **QA engineer and tech lead** auditing Ekklesia's test coverage and technical debt.
This is an MVP — zero tests today. Your job is to define what MUST be tested before scaling,
and what debt will become impossible to fix once users depend on it.

**What you already know:**
- ZERO test coverage — no framework, no test files, nothing
- 105 API routes with no automated verification
- Financial double-entry logic with no tests
- Permission resolution (3-layer merge) with no tests
- `/api/auth/dev-login` with no tests
- No pre-commit hooks, no lint-staged

Append findings to LIVE-CONTEXT.md as you discover them.

---

## SECTION 1 — Test priority map

With zero tests, we can't test everything at once. Prioritize ruthlessly.

**P0 — Must test before any production traffic:**
- `lib/permissions.ts` — 3-layer permission merge. A bug here = wrong access levels for all users.
- `lib/auth.ts` `getCurrentUserWithRole()` — core auth function called on every request.
- Finance transaction creation — double-entry integrity. A bug = wrong financial records.
- Donation creation — amount validation, fund scoping, church_id validation.
- `middleware.ts` — auth redirect logic. A bug = all users locked out or all public.

**P1 — Test before onboarding multiple churches:**
- Multi-church switching — user lands on wrong church's data
- Permission escalation prevention — member calling super_admin endpoints
- Cron job execution — notifications sent correctly without duplicates
- Church registration flow — new churches bootstrapped correctly

**P2 — Test before public launch:**
- All 168 API endpoints — at least smoke tests (returns 200 for valid, 401 for unauth)
- RLS policy verification — confirmed isolation between churches
- Visitor form public submission — no rate limit bypass
- Community needs cross-church — correct visibility rules

**Map what to test first:**
For each P0 item — what is the specific test to write?
What are the edge cases? What inputs would reveal a bug?

---

## SECTION 2 — Technical debt inventory

**The apiHandler migration debt:**
- 105 routes need migration. At 30 min per route = 52 hours of work.
- Which routes are highest risk if NOT migrated? (finance, permissions, member data)
- What is the minimum viable migration? (migrate 20 highest-risk routes first)

**lib/dashboard/queries.ts (1,524 lines):**
- This file handles all 4 role dashboards. Should be split by role.
- What is the refactoring plan? (4 role-specific files + shared utilities)
- What breaks if we split it? What tests would need to exist first?

**No `.env.example`:**
- 20+ required environment variables with no documentation
- New contributors can't run the app
- Which variables are required vs optional?
- Document the full list with descriptions

**No pre-commit hooks:**
- TypeScript errors can be committed without detection
- ESLint violations ship to production
- Simple Husky + lint-staged setup would prevent this

**Duplicate directory structure:**
- `hooks/` at root AND `lib/hooks/`
- `utils/` at root AND `lib/utils/` AND `lib/utils.ts`
- Which is canonical? Which can be deleted?

**No Supabase CLI type generation:**
- 270+ `any` violations would be eliminated
- Manual types drift from actual schema
- What is the setup procedure? What would it unblock?

**`driver.js` for onboarding tours:**
- Used only in `components/help/TeachMeWalkthrough.tsx`
- Is this feature actively maintained and used?
- Is `driver.js` maintained? Last release: v1.4.0.

---

## SECTION 3 — DX debt that blocks scaling

**No README:**
- CLAUDE.md serves as docs but isn't visible to contributors
- What does a new developer need to know to run this app?

**No CI/CD beyond Vercel auto-deploy:**
- Any push to main deploys immediately, no gates
- TypeScript errors, lint violations, broken builds all deploy
- GitHub Actions with: typecheck + lint + build verification would catch this

**No structured logging:**
- 200+ `console.error` statements — no request IDs, no church context, no severity levels
- Can't trace a production error to its cause
- Every log looks the same

**No error tracking (Sentry pending):**
- CLAUDE.md lists Sentry as pending
- Production errors are only caught by PostHog error boundaries
- Most API errors are completely invisible

---

## OUTPUT FORMAT

### Tests:
```
### TEST-N: [title]
**Priority:** P0 | P1 | P2
**What to test:** specific behavior
**Test cases:** list the exact scenarios to cover
**Why critical:** what production bug this prevents
**Framework suggestion:** vitest | jest | playwright
```

### Debt:
```
### DEBT-N: [title]
**Type:** architecture | dx | testing | dependency | documentation
**Priority:** pay-now | pay-soon | low
**Evidence:** specific finding
**Cost of not fixing:** gets worse as [X] grows
**Migration path:** specific steps
**Effort:** XS | S | M | L
```

End with:
```
## Tests/Debt summary
- P0 tests to write immediately: [N]
- Hours to establish minimum test coverage: [estimate]
- Highest-ROI debt item: [title]
- Debt that becomes unfixable after scale: [list]
```

---
---
---

