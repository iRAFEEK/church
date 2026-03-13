## CRITICAL — READ THIS FIRST
You are in **investigation mode**. Never modify any file. Only report.
Number every finding ARCH-N.

---

You are a **principal architect** auditing Ekklesia's structural problems.
This is an MVP church management app targeting scaling. The goal is to find what will
break as it grows and what structural debt will become impossible to fix later.

**Read first (do not re-discover what's already known):**
- `.claude/recon-ekklesia.md`
- The codebase-context.md and LIVE-CONTEXT.md provided

**What you already know:**
- Next.js 15 App Router, React 19, Supabase PostgreSQL, no ORM
- Server Components default, Client Components for interactivity only
- 2 API patterns coexist: `apiHandler` (11 routes, correct) vs manual (105 routes, legacy)
- Multi-tenant: church_id on every table, RLS as backup
- lib/dashboard/queries.ts — 1,524 lines, 100+ `any` types, ALL role dashboards in one file
- 105 routes manually duplicate auth/role/error — highest structural risk
- Target: budget phones, 3G, Arabic RTL, MVP heading toward scale

Append findings to LIVE-CONTEXT.md as you discover them.
If investigating a specific problem, trace that first.

---

## SECTION 1 — The apiHandler gap (105 routes without it)

`lib/api/handler.ts` is the correct pattern. Only 11 of 116 routes use it.
This is the #1 structural risk for scaling — any security fix won't propagate to 105 routes.

**Read `lib/api/handler.ts` fully first** — understand exactly what it provides.

**Sample 15 manual routes across modules:**
- Finance: `app/api/finance/donations/route.ts`, `app/api/finance/transactions/route.ts`
- Members: `app/api/profiles/route.ts`, `app/api/profiles/[id]/route.ts`
- Groups: `app/api/groups/route.ts`, `app/api/groups/[id]/route.ts`
- Permissions: `app/api/permissions/user/[id]/route.ts`
- Notifications: `app/api/notifications/route.ts`
- Events: `app/api/events/route.ts`, `app/api/events/[id]/route.ts`

For each manual route — does it:
- Call `getUser()` before any data access?
- Validate church_id ownership?
- Return `error.message` directly (leaks internal details)?
- Handle errors consistently?
- Check the correct role before allowing writes?

**Find the worst offenders** — manual routes with the weakest auth, highest data sensitivity.

**Map migration effort:**
- Which routes can be migrated to apiHandler with <30 min effort each?
- Which have unusual requirements that need apiHandler to be extended first?

---

## SECTION 2 — Multi-tenant isolation — church_id discipline

Every query must filter by church_id. RLS is backup, not primary defense.

**Walk every `app/api/*/[id]/route.ts` file:**
Pattern to find: `.eq('id', params.id)` WITHOUT `.eq('church_id', churchId)` immediately after.
Each missing filter = IDOR vulnerability — user A can access user B's church data.

**Check cross-church data flows:**
The community/needs marketplace is intentionally cross-church — needs from other churches are visible.
But: can a user modify or delete another church's need? Read `app/api/community/needs/[id]/route.ts`.
Is the responder's church_id validated on message creation?

**Multi-church session switching:**
Read `lib/auth.ts` `getCurrentUserWithRole()` fully.
When a user switches churches via `/select-church`, what changes in their session?
Could a session manipulation give access to a church they're not a member of?

---

## SECTION 3 — Data architecture — lib/dashboard/queries.ts

This 1,524-line file is the most dangerous architectural problem for scaling.

**Read it fully.** Map what it does:
- Which queries serve the `member` dashboard?
- Which serve `group_leader`?
- Which serve `ministry_leader`?
- Which serve `super_admin`?
- Which queries are shared across roles?

**Find every `any` and what it's masking:**
List each `any` with the line number and what Supabase actually returns.
Which ones would produce wrong data if a table column changes?

**Find missing church_id filters:**
Are all queries in this file scoped to a church? Or do any aggregate across all churches?

**Scaling problems:**
- Are any queries doing full table scans without index-friendly filters?
- Are there N+1 patterns (query inside a loop)?
- Could any query return unbounded data as church membership grows?

---

## SECTION 4 — Server/Client Component boundaries

**Client Components that should be Server Components:**
Walk `components/` for any `"use client"` component that:
- Has no useState, useEffect, or event handlers
- Only renders props passed to it
These waste JS bundle on 3G connections.

**Data fetching waterfalls:**
Find Client Components that fetch data via `fetch('/api/...')` when their parent Server
Component already has that data. This is a double-fetch + waterfall.

**Large components doing too much:**
Read these fully and identify mixed concerns:
- `components/bible/BiblePresenter.tsx` (769 lines)
- `components/events/TemplateForm.tsx` (602 lines)
- `components/events/InlineStaffingManager.tsx` (586 lines)
- `components/notifications/NotificationComposer.tsx` (393 lines)

For each: what are the distinct responsibilities? What is the clean split?

---

## SECTION 5 — Finance module integrity

Real donation records. Wrong data = wrong financial reports for a church.

**Read every file in `app/api/finance/`.**

Transaction atomicity:
- When creating a financial transaction with multiple line items, is it wrapped in a
  Supabase transaction? If one line item insert fails, are the others rolled back?
- Pattern: `await supabase.rpc('create_transaction_with_items', {...})` OR individual inserts?
  Individual inserts without a transaction = partial data corruption risk.

Double-entry integrity:
- Is `sum(debit_amount) === sum(credit_amount)` enforced at the application layer
  before inserting to `transaction_line_items`?

Approval workflow:
- Can a `posted` transaction be modified?
- Can a user approve their own expense request?
- Can the approval step be skipped by calling the API directly?

Restricted funds:
- When allocating from a fund with `is_restricted = true`, is the restriction enforced
  in the API before allowing the allocation?

---

## SECTION 6 — Scaling architecture gaps

This is MVP but needs a solid foundation. Find what will break at scale.

**No real-time support:**
The app has no WebSockets or SSE. As church size grows:
- Notification bell won't update without page refresh — users miss notifications
- Attendance marking during a live gathering requires manual refresh to see updates
- What is the current UX and where does it break?

**No background job infrastructure beyond Vercel crons:**
3 daily cron jobs run all notifications. As church count scales:
- Will a single cron job handle 100 churches? 1,000?
- Is there any per-church rate limiting on notification sends?
- Could a large church trigger email/push sending that exhausts Resend/Firebase quotas?

**lib/messaging/triggers.ts (661 lines):**
Read this file fully. This handles ALL notification logic.
- Is it idempotent? Could the same notification be sent twice if the cron retries?
- Is there any deduplication?
- What happens if the push/email provider is down?

**`/api/auth/dev-login` in production:**
This route has no `NODE_ENV` check. It's accessible in production.
Read it fully — what does it do? How dangerous is it?

---

## OUTPUT FORMAT

```
### ARCH-[N]: [title]
**Severity:** critical | high | medium | low
**Category:** auth-gap | data-isolation | architecture | finance | scaling | client-server
**File:** path:line
**Evidence:** exact code quoted
**Impact:** what breaks or is exploitable
**Fix:** specific change described
**Scaling risk:** how this gets worse as church count/size grows
```

End with:
```
## Architecture summary
- API routes without apiHandler: [N] (list the highest-risk ones)
- Confirmed IDOR risks: [N]
- Finance integrity gaps: [N]
- Sequential fetches → should be parallel: [N]
- Scaling time bombs: [N]
- Most dangerous file: [path]
```