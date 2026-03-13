## CRITICAL — READ THIS FIRST
You are in **investigation mode**. Never modify any file. Only report.
Number every finding SEC-N.

---

You are a **senior application security engineer** auditing a church management platform.
This app stores: member PII (names, phones, addresses, DOB), financial records (donations,
expenses, bank accounts), private prayer requests, and visitor data.
A breach doesn't just expose data — it damages church trust and member safety.

**What you already know:**
- `.env.local` potentially committed to git history with SUPABASE_SERVICE_ROLE_KEY + FIREBASE_PRIVATE_KEY
- `/api/auth/dev-login` is public and has no NODE_ENV check
- 105 manual API routes with inconsistent auth — some may have bugs
- Multi-tenant: church_id isolation is the primary guard, RLS is backup
- No rate limiting on any endpoint
- `/api/visitors` is intentionally public (visitor form) — but has no rate limiting
- 4 roles with a 3-layer permission system

Append findings to LIVE-CONTEXT.md as you discover them.

---

## SECTION 1 — Secrets exposure (P0 — act on this first)

**`.env.local` in git history:**
Run: `git log --all --full-history -- .env.local`
And: `git log --all --full-history -- .vercel/.env.development.local`
If these files appear in git history — the secrets inside are permanently exposed.

For each secret found:
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses ALL RLS policies. Full DB read/write across all churches.
- `FIREBASE_PRIVATE_KEY` — can send push notifications to any device, impersonate the app
- `RESEND_API_KEY` — can send emails from the app's domain
- `WHATSAPP_*` — can send WhatsApp messages as the church

Document exactly what each exposed key allows an attacker to do.
Recommend immediate rotation for each.

**`/api/auth/dev-login`:**
Read this file fully.
- What does it do? Can it log in as any user without a password?
- Is there any NODE_ENV check?
- Is it rate limited?
- In production today — is this accessible and functional?

---

## SECTION 2 — Authentication gaps across 105 manual routes

Middleware checks session (JWT validation) for all non-public routes.
But each API route must also verify the user server-side.

**Find routes missing `getUser()` call:**
Walk 20+ manual API routes looking for routes that:
- Trust the session cookie without calling `supabase.auth.getUser()`
- Only check `getSession()` (local JWT) instead of `getUser()` (server verification)
  The difference: `getSession()` can be spoofed with a manipulated JWT. `getUser()` cannot.
- Skip the church_id validation entirely and trust a body param

**Find routes with wrong role checks:**
Should require `super_admin` but only checks `group_leader`:
- `app/api/permissions/` routes — changing permissions should require `super_admin`
- `app/api/finance/` write routes — should require `manage_finance` permission
- `app/api/notifications/` send route — should require `send_notifications`

**Find routes where role check comes AFTER data access:**
```typescript
// BAD: data fetched before auth check
const { data } = await supabase.from('sensitive_table').select('*')
const { user } = await supabase.auth.getUser()  // auth check comes AFTER
```

---

## SECTION 3 — IDOR vulnerabilities (cross-church data access)

**Walk every `app/api/*/[id]/route.ts`:**
For each GET, PATCH, DELETE:
- Does it filter by BOTH `id` AND `church_id`?
- Pattern: `.eq('id', id).eq('church_id', churchId)` — both required
- Single `.eq('id', id)` = IDOR vulnerability (RLS is last line of defense)

**Highest-risk IDOR targets:**
- `app/api/finance/donations/[id]/route.ts` — financial records
- `app/api/profiles/[id]/route.ts` — member PII
- `app/api/visitors/[id]/route.ts` — visitor contact info
- `app/api/permissions/user/[id]/route.ts` — permission escalation
- `app/api/groups/[id]/route.ts` — group membership data
- `app/api/church-prayers/[id]/route.ts` — private prayer requests

**Cross-church community needs:**
`/api/community/needs/` is intentionally cross-church.
But for responses and messages:
- Can user A from Church 1 read messages between Church 2 and Church 3?
- Is `responder_church_id` validated against the user's actual church?

---

## SECTION 4 — Injection and input validation

**SQL injection via Supabase:**
Supabase query builder is parameterized by default — standard queries are safe.
But find any `.filter()` or `.textSearch()` calls where user input is directly interpolated.
Also find any `supabase.rpc()` calls where user input is passed — RPCs can be injection vectors.

**Path traversal:**
Find any file system operations using user input: `fs.readFile(userInput)`, `path.join(...userInput)`.

**Webhook validation:**
Read `app/api/webhooks/route.ts` fully.
- Is the WhatsApp webhook signature validated?
- What happens if someone sends a spoofed webhook payload?
- Could a malicious webhook payload trigger unintended notifications or data changes?

**Public routes with no rate limiting:**
- `/api/visitors` — public POST, no rate limit. Attacker can spam visitor records.
- `/api/churches/register` — public POST, no rate limit. Attacker can create junk churches.
- `/api/auth/dev-login` — if enabled in production, no rate limit on login attempts.

---

## SECTION 5 — Data privacy and PII

**Sensitive data in logs:**
Search all `console.log`, `console.error` for:
- User emails, phone numbers, names
- Donation amounts, financial data
- Prayer request content
- Profile data

**Analytics PII:**
Read `lib/analytics/events.ts` and all `trackEvent()` calls.
- Are any PII fields (name, email, phone) included in PostHog events?
- Are donation amounts tracked? (financial PII)
- Are prayer request IDs tracked? (sensitive)

**Private prayer requests:**
Table `prayer_requests` has `is_private` and `is_anonymous` fields.
- Do the API routes enforce these? Can a group leader see private prayer requests from members?
- Read `app/api/gatherings/[id]/prayer/route.ts` and `app/api/church-prayers/route.ts`

**Member data visibility:**
Can a `member` role access other members' full profiles (phone, DOB, address)?
Read `app/api/profiles/[id]/route.ts` — what does it return for a `member` calling on another member's ID?

---

## SECTION 6 — Session and auth security

**Session fixation:**
After login, is a new session created? Or does the existing session ID persist?
Supabase handles this — but verify `lib/auth.ts` doesn't have any custom session handling.

**JWT validation:**
Middleware uses `getSession()` (local JWT check). API routes should use `getUser()` (server verify).
Find any API route using ONLY `getSession()` without `getUser()`.
A tampered JWT passes `getSession()` but fails `getUser()`.

**Multi-church privilege escalation:**
User belongs to Church A as `member` and Church B as `super_admin`.
If they switch to Church A — can they call Church B admin endpoints using their active session?
Read how `getCurrentUserWithRole()` scopes the role to the active church.

**Cron job security:**
Read `app/api/cron/` routes.
- Is `CRON_SECRET` validated with a constant-time comparison? (timing attack prevention)
- What's the format of `CRON_SECRET`? Is it guessable?
- Are cron routes in the public middleware bypass list? Could an attacker enumerate them?

---

## OUTPUT FORMAT

```
### SEC-[N]: [title]
**Severity:** critical | high | medium | low
**OWASP:** A01-Access-Control | A02-Crypto | A03-Injection | A05-Misconfiguration | A07-Auth | A09-Logging
**File:** path:line
**Evidence:** exact code quoted
**Attack scenario:** step-by-step — what an attacker does, what they get
**Data at risk:** what data is exposed (PII, financial, prayer, member data)
**Fix:** specific change described (not applied)
**Exploitable today:** yes | requires git access | requires auth
```

End with:
```
## Security summary
- Secrets exposed in git: [list]
- IDOR vulnerabilities: [N]
- Routes missing proper auth: [N]
- PII exposure risks: [N]
- Rate limiting gaps: [N]
- Overall posture: critical | needs-work | acceptable
- Single most dangerous finding: [SEC-N]
```