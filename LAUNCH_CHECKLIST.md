# Ekklesia — Pre-Launch To-Do List

> Living checklist to take Ekklesia from "feature-complete" to "safely live with real churches."
> Created: 2026-06-22 · Grounded in a direct codebase audit (not just the State-of-the-Product report).
> Verified counts: 74 migrations · 146 API routes · 113 pages · 113 loading states · 2,558 EN keys.

**Legend:** Effort — S (<½ day) · M (½–2 days) · L (2–5 days) · XL (>1 week)
Owner column is yours to fill in. Check items off as they land.

---

> 🆕 **Onboarding rebuild workstream (Track A):** the way churches + members come on board is being rebuilt (phone/WhatsApp OTP identity, leader-add + claim, request→approve membership lifecycle, per-church directory privacy). Full spec: [ONBOARDING_PLAN.md](ONBOARDING_PLAN.md). This runs alongside the P0/P1 hardening below.

---

## ▶️ FIRST-PILOT GO-LIVE — Exact Remaining Steps (updated 2026-07-07)

> The **code** is pilot-ready. What's left is almost entirely operator actions in the Vercel / Supabase / Meta / Upstash / Sentry dashboards. Do these in order. Anything marked ✅ is already done in code.
>
> **1. Production database.** Rebuild prod from `supabase/migrations/` (now **001→085**, seed migrations EXCLUDED) → run `npm run verify:schema` until green. **Migrations 084 & 085 are written but NOT applied — apply them.** See [supabase/REBUILD_AND_VERIFY.md](supabase/REBUILD_AND_VERIFY.md).
>
> **2. Rotate every key** that has touched a laptop and set them in Vercel env (Production scope):
> - **Required (app won't work without these):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (the real prod domain — used for email links), Firebase (`FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`).
> - **Set now:** `CRON_SECRET` (a fresh random string — I've only used a local test value), `PLATFORM_ADMIN_EMAILS=ranytenma@gmail.com` (the operator who approves incoming churches).
>
> **3. Password reset (NEW — shipped this session, needs Supabase config to actually deliver mail):**
> - Supabase → **Auth → URL Configuration → Redirect URLs**: add `https://<prod-domain>/reset-password` (and `/select-church`, `/` if not already allowlisted). Without this the reset link is rejected.
> - Supabase → **Auth → SMTP**: configure a real SMTP sender (or confirm Supabase's built-in email is enabled) so recovery emails actually send. Test: request a reset for a real inbox and confirm the mail arrives and the link lands on `/reset-password`.
>
> **4. WhatsApp OTP login (you chose to run this live).** Code path ✅ built. External setup required: register a Meta WhatsApp Business number, get the **authentication-category OTP template approved**, then in Supabase enable the **Phone provider + Send-SMS auth hook** pointed at `/api/auth/sms-hook`, and set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_OTP_TEMPLATE`, `SEND_SMS_HOOK_SECRET`. Full guide: [docs/WHATSAPP_OTP_SETUP.md](docs/WHATSAPP_OTP_SETUP.md). Email/password (+ reset above) is the working fallback until this is approved.
>
> **5. Turnkey services (✅ code already boots cleanly without them — just paste keys in Vercel to activate):**
> - **Upstash** (distributed rate limiting): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Until set, rate limiting is in-memory (weak on serverless).
> - **Sentry** (errors): `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`, `SENTRY_PROJECT` for source maps). Then fire a test error and confirm it lands.
> - **PostHog** (analytics): `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PROJECT_API_KEY`. Then confirm `login` + one event land.
>
> **6. Data safety:** enable Supabase **PITR / daily backups** and do one test restore before real data.
>
> **7. Deploy `main` + smoke test:** confirm the deployed build serves the prod DB, log in as `ranytenma@gmail.com`, walk dashboard → one core flow. One real Android + Arabic/RTL pass.
>
> **Done this session (code):** ✅ password reset/recovery flow · ✅ `notification-cleanup` cron bug fixed **and** scheduled (weekly) · ✅ 1 critical + 12 high dependency CVEs patched (`npm audit`) · ✅ authz+CRUD e2e coverage · ✅ P0 privilege-escalation test made real (executing) · ✅ verified Sentry/PostHog/Upstash are gracefully optional.

## P0 — Launch Blockers (do before ANY real church touches the app)

These are correctness/safety gates. A real church onboarded before these is a real risk.

- [ ] **Apply all migrations 001→085 to the production Supabase project and verify.** Diff prod schema vs `supabase/migrations/`. Confirm RLS is enabled on every table. Run `npm run verify:schema`. **084 & 085 are written but not yet applied.** — `L`
- [ ] **Independent security / RLS review before onboarding.** 9 of 74 migrations are "fix" migrations, several closing RLS gaps (push tokens, notifications were briefly too open). Gaps are closed, but the reactive pattern warrants one defensive pass. Focus: cross-church isolation, the newer tables (meetings, action items, bookings, liturgy, shared songs, outreach assignments). — `L`
- [ ] **Rotate ALL keys for production** (Supabase service role, Firebase admin private key, Resend, WhatsApp, PostHog, CRON_SECRET). Treat any key that has lived in a working folder / laptop as compromised-by-default. — `S`
- [ ] **Verify multi-church isolation with real concurrent data.** Two churches, overlapping users, confirm zero cross-tenant leakage in: members, finance, prayers, notifications, community needs, songs (incl. the new scoped/global song sharing). — `M`
- [x] ~~Gate every backend-only feature behind a feature flag~~ — **NOT NEEDED.** Verified 2026-06-24: ministry meetings, action items/tasks, outreach assignments, and prayer responses are **fully built and wired with live UI** (the State-of-Product report was stale). Nothing half-built to hide.
- [ ] **Confirm `CRON_SECRET` is set in prod and cron auth is enforced** on `/api/cron/*` (event reminders, visitor SLA, notification retention). — `S`

---

## P1 — Launch-Critical (do before opening the doors)

- [ ] **WhatsApp OTP provider — START NOW (lead time).** Onboarding identity is phone/WhatsApp OTP. Register a Twilio WhatsApp sender + submit the **Meta Business WhatsApp OTP template for approval** (external approval lead time), then wire Supabase phone auth to it. Blocks the new sign-up/claim flow. — `M` (+ external wait)
- [ ] **Move rate limiting to a shared store (Upstash/Redis).** Current limiter is in-memory (`lib/api/rate-limit.ts` — the code comment already says so). On Vercel's many short-lived instances it's far weaker than it looks. — `M`
- [ ] **Real-device testing matrix:** budget Android + iOS, Arabic (RTL) mode, offline/airplane (PWA fallback), PWA install flow, push notifications end-to-end (FCM). Document results. — `M`
- [ ] **Ship real brand PWA icons** (192px, 512px, maskable) — currently placeholders in `public/icons`. — `S`
- [ ] **Run a Lighthouse baseline on the production URL** for `/dashboard`, `/admin/finance`, `/events`, `/bible`. Record scores in CLAUDE.md §9 (only 3 routes measured today). — `S`
- [ ] **Finish Egyptian-Arabic translations: 332 missing keys** (`messages/ar-eg.json` has 2,226 of 2,558). Users currently get fallback text. Also close the 12-key `ar` gap. — `M`
- [x] **Add end-to-end tests for the critical paths** — **DONE 2026-06-24.** 8 Playwright specs in `e2e/` cover permission enforcement, finance-off, onboarding gate + completion, visitor intake, member/leader/admin mutations, cross-church, and two-church isolation. Caught + fixed a real visitor-form blank-field bug and 2 access-control gaps. (Giving paths deferred — finance is flagged OFF.)
- [ ] **Wire up Sentry + verify alerts fire** in production (errors, source maps, release tracking). Confirm conditional import doesn't suppress prod errors. — `S`
- [ ] **Verify PostHog in prod** (EU residency, no PII in events, identify on login). Spot-check 5 key events actually land. — `S`
- [ ] **Health check + uptime monitor** pointed at `/api/health`. — `S`
- [ ] **Set up DB backups / point-in-time recovery** on the production Supabase project and test a restore. — `M`
- [ ] **Confirm `npm run build` is green and `npx tsc --noEmit` is 0 errors** in CI (report couldn't verify these in its sandbox). Add to a pre-deploy gate. — `S`

---

## P2 — Pilot Phase (1–3 friendly churches, behind flags)

- [ ] **Onboard 1–3 known churches**, watch Sentry + PostHog daily for the first 2 weeks. — `M`
- [ ] **Tighten the rough edges real users expose** in the highest-traffic flows: visitor intake form, finance data entry, notifications delivery. — `M`
- [ ] **Load-sanity the finance module** with a real chart of accounts + a month of donations; confirm reports and double-entry balances hold. — `M`
- [ ] **Collect a feedback channel** (in-app or WhatsApp) and triage weekly. — `S`
- [ ] **Write a 1-page onboarding runbook** for a new church (create church → import members → set roles → first event). — `S`

---

## P3 — Fast-Follow (quick wins — backend already done, just needs UI)

The data model + API exist; these are UI-only builds. High value, low risk.

- [ ] **Ministry meetings UI** — schedule, notes, action items. API: `app/api/ministries/[id]/meetings`, migration 059. — `M`
- [ ] **Action items / tasks UI** — standalone + meeting-linked, assignable to members. API: `app/api/ministries/[id]/action-items` + migration 063. — `M`
- [ ] **Outreach assignments UI** — assign members to outreach leaders for accountability. API: `app/api/outreach/assignments`, migration 060. — `M`
- [ ] **Prayer responses UI** — richer response/update tracking on prayers. Migration 061. — `M`
- [ ] Add nav entries + permission flags + `loading.tsx` + i18n for each of the above (per project standards). — `S each`

---

## P4 — Code Quality & Tech-Debt Cleanup (non-blocking, do alongside)

- [ ] **Sync CLAUDE.md + `types/database.ts` with reality.** Docs stop at 55 migrations / March 15; codebase is at 74 with whole features (shared song library, Coptic liturgy, locations/bookings, meetings) undocumented. Replace manual DB types with `supabase gen types`. — `M`
- [ ] **Reduce loose `any` types: 83 today** (docs claimed ~11). Not alarming, but trending up. — `M`
- [ ] **Replace 31 raw `console.*` calls** in `app/`/`lib/` with the structured logger. — `S`
- [ ] **Narrow the 2 remaining `select('*')`** in API routes. — `S`
- [ ] **Add CI workflow** running `vitest`, `tsc --noEmit`, build, and the RTL grep check on every PR. — `M`

---

## P5 — Monetization & Scale (post-launch, plan deliberately)

- [ ] **Online giving via Stripe** — only a flag exists today (`finance/settings`). Likely the biggest adoption/monetization driver; design it properly, not as an afterthought. — `XL`
- [ ] **Donation receipts (PDF)** and **bank reconciliation** — tables/flags exist, UI/logic don't. — `L`
- [ ] **Native app-store distribution** via the started Capacitor wrapper (Android first, then iOS) with FCM. — `XL`
- [ ] **Recurring donations**, email campaigns, small-group curriculum — growth features. — `XL`

---

## Risk Register (CEO-level, from the audit)

| Risk | Severity | Mitigation (mapped to items above) |
|---|---|---|
| Reactive security history (RLS gaps fixed late) | Medium | P0 security review + P0 isolation test |
| In-memory rate limiting won't scale on serverless | Medium | P1 move to Upstash/Redis |
| Live keys sit in working folder | Medium | P0 rotate all keys + encrypt laptops/backups |
| No e2e tests | Low–Med | P1 e2e for sign-up / giving / permissions |
| Doc drift / single-founder bus factor | Medium | P4 sync CLAUDE.md, keep current |
| Unfinished features could surface half-built | Low | P0 feature-flag gating |
| No payment processing yet | Low | P5 Stripe, planned deliberately |

**Reassuring context:** no evidence of cross-church data leakage, no secrets in git, no architectural dead-ends. This is a normal pre-launch hardening list for a serious product — the gap to launch is operational, not foundational.
