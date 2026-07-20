# Ekklesia — Pre-Launch Operations Runbook

> The launch items that **cannot be done in code** — they need your production dashboards,
> physical devices, third-party accounts, or human decisions. Work top to bottom.
> Companion to [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). Last updated: 2026-06-22.

---

## 1. Apply database migrations to production  🔴 BLOCKER

Your local repo has **74 migrations** (`supabase/migrations/001…073`). Production must match.

```bash
# Link the CLI to your prod project (one time)
supabase link --project-ref <your-prod-project-ref>

# Dry-run: see what would change
supabase db diff --linked

# Apply
supabase db push --linked
```

Then verify in the Supabase dashboard → Database:
- [ ] All 74 migrations show as applied (`supabase migration list --linked`)
- [ ] RLS is **enabled** on every table (Table Editor → each table → "RLS enabled" badge)
- [ ] **Migration 073** is present (the songs cross-church write fix from this session)

> ⚠️ Migration 073 closes a real security gap (a leader could edit another church's
> private songs). Do not onboard a second church until it's applied.

---

## 2. Rotate all production keys  🔴 BLOCKER

Any key that has lived on a laptop or in a working folder is "burned." Generate fresh ones
for production and retire the old:

| Key | Where to rotate |
|-----|-----------------|
| Supabase `service_role` + `anon` | Supabase → Project Settings → API → "Reset" |
| Firebase Admin private key | Firebase Console → Project Settings → Service Accounts → Generate new key |
| `CRON_SECRET` | Generate a random 32+ char string; set in Vercel env |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console (see §3) |
| Resend / WhatsApp / PostHog | Each provider's dashboard |

- [ ] Set the **new** values in Vercel → Settings → Environment Variables (Production scope)
- [ ] Confirm laptops/backups holding old keys are disk-encrypted
- [ ] Never commit real keys — only `.env.example` is tracked (verified clean)

> ⚠️ **`PLATFORM_ADMIN_EMAILS` is secret-tier config, not just a setting.** It is the
> *entire* gate for who can approve/reject churches across all tenants (the church
> onboarding flow). Anyone who can edit this Vercel env var can grant themselves
> cross-church approval power. Keep it to the minimum trusted operator emails, set it
> in Production scope only, and treat changes to it like a key rotation (review who has
> Vercel env access). The emails must be verified Supabase auth accounts.

---

## 3. Enable distributed rate limiting (Upstash)  🟠 LAUNCH-CRITICAL

The code is **already wired** — it activates automatically once these env vars exist
(falls back to in-memory otherwise).

1. Create a free Redis DB at <https://console.upstash.com/redis> (pick the region nearest your Vercel deployment).
2. Copy the **REST URL** and **REST TOKEN**.
3. Vercel → Environment Variables (Production):
   - [ ] `UPSTASH_REDIS_REST_URL`
   - [ ] `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy. To verify: hit any API route rapidly >30×/min and confirm a `429` with
   `X-RateLimit-*` headers.

---

## 4. Real-device testing matrix  🟠 LAUNCH-CRITICAL

Test on **actual budget hardware**, not just your phone or a simulator. For each cell, note pass/fail:

| Scenario | Android (budget) | iPhone |
|----------|------------------|--------|
| Login + onboarding | ☐ | ☐ |
| Arabic (RTL) layout — no clipped/mirrored UI | ☐ | ☐ |
| Record a donation → see it in My Giving | ☐ | ☐ |
| Offline / airplane mode → PWA offline page | ☐ | ☐ |
| Install PWA to home screen → launches standalone | ☐ | ☐ |
| Push notification received (foreground + background) | ☐ | ☐ |
| Slow 3G (Chrome DevTools throttle) — pages usable | ☐ | ☐ |

---

## 5. Brand PWA icons  🟠 LAUNCH-CRITICAL

`public/icons` currently holds placeholders. Replace with real brand icons:
- [ ] `192×192` (any-purpose)
- [ ] `512×512` (any-purpose)
- [ ] `512×512` **maskable** (safe-zone padded)
- [ ] `apple-touch-icon.png` (180×180)
- [ ] Confirm `manifest`/`next.config` references resolve (install prompt shows the real icon)

---

## 6. Lighthouse baseline on production  🟠 LAUNCH-CRITICAL

Once deployed to the prod URL, run Lighthouse (Chrome DevTools → Lighthouse, Mobile preset) on:
- [ ] `/dashboard`
- [ ] `/admin/finance`
- [ ] `/events`
- [ ] `/bible`

Record scores in `CLAUDE.md §9`. Target: Performance ≥ 85 on mobile.

---

## 7. Monitoring & backups  🟠 LAUNCH-CRITICAL

- [ ] **Sentry**: confirm DSN env var set; trigger a test error and confirm it appears. Verify source maps upload on deploy.
- [ ] **PostHog**: confirm events land in prod (EU residency), user identify on login, no PII in payloads.
- [ ] **Uptime monitor**: point a checker (e.g. BetterStack, UptimeRobot) at `/api/health`.
- [ ] **Backups**: enable Point-in-Time Recovery in Supabase → Database → Backups, and **do a test restore** to a scratch project.

### 7a. Domain health monitor (built-in, hourly)

`GET /api/cron/domain-health` runs **hourly** (`0 * * * *`, see `vercel.json`). It fetches
`$HEALTH_CHECK_URL/api/health` (falls back to `NEXT_PUBLIC_APP_URL`, then
`https://www.miaekklesia.com`) with a 10s timeout, plus an informational probe of the bare
apex. DOWN = the request threw **or** the status was not 2xx. On DOWN it logs
`[CRON] domain health check FAILED` and emails `ALERT_EMAIL` (fallback: first address in
`PLATFORM_ADMIN_EMAILS`) via Resend.

It always returns HTTP 200 — the `ok` field carries the verdict, and the 200 means the cron
itself ran. A non-200 would make Vercel retry and double-send alerts.

**Degrades gracefully:** if `RESEND_API_KEY` or the recipient is unset, the cron does **not**
crash — it logs an error so the outage still surfaces in Vercel logs / Sentry, and returns
`alerted: false`. Set both env vars or you get logs only, no email.

- [ ] Set `ALERT_EMAIL` in Vercel (Production) and confirm `RESEND_API_KEY` is present.

#### Incident: TLS certificate binding lost (seen in production)

**Symptom:** the site is unreachable over HTTPS while plain HTTP still answers. `curl -v`
against `https://www.miaekklesia.com` fails during the handshake with
**"no peer certificate available"**. Vercel's edge has lost the cert binding for the custom
domain; nothing is wrong with the app code or the database.

**Fix:**
```bash
vercel certs issue miaekklesia.com www.miaekklesia.com
```
Then **wait ~5 minutes** for propagation before re-testing. **Do not run it repeatedly** —
Let's Encrypt enforces issuance rate limits, and hammering the command will lock you out of
re-issuing for hours, turning a 5-minute outage into a much longer one.

---

## 8. Independent security / RLS review  🔴 BLOCKER (before 2nd church)

9 of 74 migrations are "fix" migrations — several closed RLS gaps after they surfaced.
Before real churches share the platform, get a focused review (internal or external) covering:
- [ ] Cross-church isolation on the newer tables: meetings, action items, bookings/locations, liturgy, shared songs, outreach assignments, church needs.
- [ ] Write-path RLS (UPDATE/DELETE) on every table, not just SELECT — this is where migration 073's bug lived.
- [ ] The two manual (non-apiHandler) public routes: `GET /api/songs` and `/api/churches/search` rely on middleware/RLS — confirm that's sufficient.
- [ ] Run the live multi-church isolation test: two churches, overlapping users, verify zero leakage.

---

## 9. Stripe online giving  🟢 POST-LAUNCH (business decision)

Only a feature flag exists today — no payment processing is built. Before building:
- [ ] Decide entity/account for receiving funds + payout destination
- [ ] Create Stripe account; decide Checkout vs. Payment Element
- [ ] Plan fees, refunds, receipts, and reconciliation against the existing double-entry ledger
- [ ] This is a deliberate project, not a quick add — scope it separately

---

## Quick status legend
🔴 Blocker — do before any real church · 🟠 Launch-critical — before opening doors · 🟢 Post-launch
