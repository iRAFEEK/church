# Ekklesia — Future-Work Backlog

> Prioritized backlog for taking Ekklesia from "feature-complete" to "safely live and growing."
> Mined from `LAUNCH_CHECKLIST.md` and `CLAUDE.md` (§10 Pending / Not Started + In Progress).
> Sizes: **S** (<½ day) · **M** (½–2 days) · **L** (2–5 days) · **XL** (>1 week).
> **Intern-friendly?** = safe for Rafeek to pull without deep context (yes / maybe / no).
>
> This is a living doc. When you finish an item, check it off and note the commit. When you
> discover new work, add it to the right section with a size + intern tag.

---

## 🌱 Good first tasks (intern-friendly S items — start here)

These are small, low-blast-radius, and don't touch auth/RLS/finance. Great warm-ups for Rafeek.

- [ ] **Ship real brand PWA icons** — replace placeholders in `public/icons` (192px, 512px, maskable, apple-touch). Confirm the install prompt shows the real icon. **(S)**
- [x] **Narrow the remaining `select('*')` in API routes** — **DONE.** Verified 2026-07-20: zero `select('*')` in production code (`app/`, `lib/`, `components/`). The only two matches are in `app/api/songs/__tests__/route.test.ts`, which *asserts its absence*.
- [ ] **Replace raw `console.*` calls** in `app/`/`lib/` with the structured logger (`lib/logger.ts`). **(S)**
- [ ] **Run a Lighthouse baseline** on the prod URL for `/dashboard`, `/admin/finance`, `/events`, `/bible`; record scores in `CLAUDE.md §9`. **(S)**
- [ ] **Finish Egyptian-Arabic translations** — fill missing keys in `messages/ar-eg.json` (and close any `ar` gaps) so all three locale files reach parity. Mechanical, well-scoped, teaches the i18n system. **(S–M)**

> ⚠️ Anything touching migrations, RLS, `handle_new_user`, finance, or key rotation is **NOT**
> an intern task. Those are marked "no" below and belong to the lead.

---

## 🚀 Launch-blocking (must land before real churches touch prod)

These are correctness/safety gates. Mostly operator actions in the Vercel/Supabase/Meta dashboards.

- [ ] **Apply migrations 087 + 088 to production Supabase** and verify. 084/085/086 are already on prod; 089 is redundant there. 087 (`platform_admins`) + 088 (`member_join_pending`, alters the `handle_new_user` auth trigger) gate approver-management-from-UI and the member-approval queue. Run `npm run verify:schema` until green. **(L · intern: no)**
- [ ] **Prod data hygiene** — 30 of 39 active prod churches are `[SIM] …` fake churches from the load simulation and show up in the public logged-out signup search. Deactivate/delete them before pilot. **(S · intern: no — prod data)**
- [ ] **Rotate ALL production keys** (Supabase service role + anon, Firebase admin private key, Resend, WhatsApp, `CRON_SECRET`, PostHog). Any key that has lived on a laptop is burned. **(S · intern: no — secrets)**
- [ ] **Set `PLATFORM_ADMIN_EMAILS` in Vercel (Production scope)** — the entire gate for who can approve/reject churches. Already `ranytenma@gmail.com`; treat any change like a key rotation. **(S · intern: no — secrets)**
- [ ] **Confirm `CRON_SECRET` is set in prod and cron auth is enforced** on `/api/cron/*` (event reminders, visitor SLA, notification retention). **(S · intern: no — prod config)**
- [ ] **Independent security / RLS review before onboarding.** Focus on cross-church isolation on newer tables (meetings, action items, bookings, liturgy, shared songs, outreach assignments, church needs) and write-path (UPDATE/DELETE) RLS. **(L · intern: no)**
- [ ] **Verify multi-church isolation with real concurrent data** — two churches, overlapping users, zero cross-tenant leakage in members, finance, prayers, notifications, community needs, songs. **(M · intern: maybe — can help drive the manual test)**
- [ ] **Set up DB backups / PITR** on prod Supabase and test a restore to a scratch project. **(M · intern: no — prod)**
- [ ] **Confirm `npm run build` green + `npx tsc --noEmit` = 0** as a pre-deploy gate. **(S · intern: yes — just run and report)**

---

## 🛡️ Post-launch / hardening (before or right after opening the doors)

- [ ] **WhatsApp OTP login go-live** — code path is built; needs Meta WhatsApp Business number + approved authentication-category OTP template + Supabase Phone provider / Send-SMS hook wired to `/api/auth/sms-hook`. Blocked on Meta payment validation (see memory note). Email/password + reset is the working fallback. **(M + external wait · intern: no)**
- [ ] **Move rate limiting to Upstash/Redis** — code is already wired; just needs `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel. In-memory fallback is weak on serverless. **(M · intern: no — prod config, but the code path is done)**
- [ ] **Wire up Sentry + verify alerts fire in prod** (errors, source maps, release tracking). Confirm the conditional import doesn't suppress prod errors. **(S · intern: no — prod config)**
- [ ] **Verify PostHog in prod** (EU residency, identify on login, no PII in payloads). Spot-check 5 key events land. **(S · intern: maybe)**
- [ ] **Health check + uptime monitor** pointed at `/api/health`. **(S · intern: no — external account)**
- [ ] **Vercel Analytics + Speed Insights** enablement. **(S · intern: no — prod config)**
- [ ] **Real-device testing matrix** — budget Android + iOS, Arabic/RTL, offline/airplane (PWA fallback), PWA install, push end-to-end (FCM). Document results. **(M · intern: maybe — great for pairing)**
- [ ] **Ship real brand PWA icons** — see Good first tasks. **(S · intern: yes)**
- [ ] **Lighthouse baseline on prod URL** — see Good first tasks. **(S · intern: yes)**

---

## ✨ Feature work

- [ ] **Egypt online-payments integration (CAPSTONE — tracked future item).** The biggest adoption/monetization driver. Today only a feature flag exists in `finance/settings` — no payment processing is built. Design deliberately (entity/account for receiving funds, payout destination, fees, refunds, receipts, reconciliation against the existing double-entry ledger). Scope as its own project. Note: finance is currently flagged **OFF** and has schema/code drift — reconcile finance first. **(XL · intern: no — capstone)**
- [ ] **Finance module completion** — bank reconciliation, recurring donations, donation receipts (PDF). Tables/flags exist; UI/logic don't. Gated behind the same finance reconciliation. **(L · intern: no)**
- [ ] **Native app-store distribution** via the started Capacitor wrapper (Android first, then iOS) with FCM push. **(XL · intern: no)**
- [ ] **Growth features** — email campaigns, small-group curriculum, richer recurring donations. **(XL · intern: no)**
- [ ] **Write a 1-page new-church onboarding runbook** (create church → import members → set roles → first event). Partly captured in `docs/NEW_CHURCH_ONBOARDING.md`. **(S · intern: maybe)**

---

## 🧹 Tech debt (non-blocking, do alongside)

- [ ] **Sync `CLAUDE.md` + `types/database.ts` with reality** and replace manual DB types with `supabase gen types typescript`. **(M · intern: maybe — the type-gen part is safe)**
- [ ] **Reduce loose `any` types** (trending up; count in `LAUNCH_CHECKLIST.md`). **(M · intern: yes — file-by-file, low risk)**
- [x] **Narrow the remaining `select('*')`** in API routes — **DONE** (2026-07-20). Zero `select('*')` remain in production code; the only matches are an assertion-of-absence in `app/api/songs/__tests__/route.test.ts`.
- [ ] **Replace raw `console.*` with the structured logger** — see Good first tasks. **(S · intern: yes)**
- [ ] **Renumber duplicate migration files** (two `032_*`, two `033_*`; already renamed to `032b`/`033b` to keep order — adopt Supabase timestamped filenames for *new* migrations going forward). **(S · intern: no — migration ordering is subtle)**
- [ ] **Supabase CLI type generation** to replace the placeholder `types/database.ts`. **(M · intern: maybe)**
- [ ] **CI hardening** — keep `vitest`, `tsc --noEmit`, `build`, and the RTL grep green on every PR. **(M · intern: maybe)**

---

## Notes on how to use this backlog

- **Intern tags** are a safety heuristic, not permission — always confirm scope with Rany before starting a "no" item.
- The single source of truth for launch sequencing is `LAUNCH_CHECKLIST.md` (the "FIRST-PILOT GO-LIVE" section). This backlog reorganizes it by work-type; when they disagree, the checklist wins.
- Operator/dashboard steps (keys, backups, DNS, Meta) live in `OPERATIONS_RUNBOOK.md`.
