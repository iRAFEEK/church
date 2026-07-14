# What Ekklesia Has Shipped So Far

> Onboarding reference for new engineers. This is a **snapshot** organized by module.
> The authoritative, dated, running history is the **Change Log in `CLAUDE.md` §15** — when this doc and the Change Log disagree, the Change Log wins.
> Where a capability's state depends on a feature flag, that flag is the source of truth (`lib/features.ts`) — see [`docs/FEATURE_FLAGS.md`](./FEATURE_FLAGS.md).

**Status legend**
- **Live** — built, wired, and reachable in production by default.
- **Live-but-flagged-OFF** — fully built but gated behind a feature flag that defaults to `false`, so it is unreachable in prod today (pages redirect, API returns 404, nav hidden).
- **Partial** — shipped but with known gaps / follow-up work outstanding.

**Overall project status:** Pre-launch / pilot-ready. Deployed to Vercel (`miaekklesia.com`). Not publicly released. Arabic-first (RTL) with English toggle. Multi-tenant — every table is `church_id`-scoped with RLS.

---

## Members

**What it does:** Church member directory and per-member profile with history.

- Member list with search, pagination (25/page), and status filtering.
- Member detail: milestones, involvement, attendance history, role editor, photo upload.
- At-risk / absence tracking views.
- Leader-add of a member by name (+ optional phone) creating a claimable **shadow identity** the person later claims via OTP (see Onboarding/Auth).
- Per-church **phone-number privacy**: `member_directory_visibility` (`everyone` / `leaders_only` (default) / `hidden`) gates who sees member phones across the directory, group/ministry pages, outreach, serving, and at-risk views (`lib/members/visibility.ts`, `canCallerViewMemberPhones`).
- Performance indexes for member list / search / count / at-risk (migration 086).

**Status:** Live.

---

## Visitors

**What it does:** Visitor pipeline from first contact to conversion.

- Public QR intake form at `/join` (no auth) — per-church configurable intake fields (migration 056).
- Visitor queue with statuses (new / assigned / contacted / converted / lost) and assignment to leaders.
- Leader "My Visitors" view for assigned visitors.
- SLA escalations via cron.

**Status:** Live.

---

## Groups

**What it does:** Small-group management and gatherings.

- Group CRUD; group membership; group leader "My Group" page.
- Gatherings (meeting instances) with attendance (present / absent / excused / late) and in-gathering prayer list.
- Swipe attendance + attendance roster UI.
- Group join requests: member requests → leader approves/declines (migration 058).
- Default groups/ministry provisioning for new churches (migration 057).

**Status:** Live.

---

## Ministries

**What it does:** Ministry-team coordination.

- Ministry CRUD with member management and roles-in-ministry.
- Ministry meetings (migration 059).
- Standalone + meeting-linked action items / tasks (migration 063).

**Status:** Live.

---

## Events + Service Builder

**What it does:** Church events, RSVPs, and run-of-show service planning.

- Event CRUD; member-facing event list + detail; event registrations/RSVPs.
- Service planning: service needs per ministry, volunteer assignments (assigned/confirmed/declined), role presets (migrations 017, 020).
- Members can express serving interest via service requests (migration 062).
- **Service Builder** (migration 091): run-of-show `event_segments` gained a `kind` (`generic` / `song` / `bible` / `file`). A segment can BE a song (present via `/presenter/songs`), a Bible passage (`/presenter/bible`), or an uploaded slide deck / PDF. "Add to service" lives on the Songs and Bible screens; the Add-Segment song/bible steps reuse the real `SongsTable` (pick mode) and Bible reader. Public `service-attachments` storage bucket for projector display. **Applied to prod 2026-07-12.**
- **Event templates** (reusable events with recurrence, custom fields, template segments/needs; migrations 021, 023) are built but currently **flagged OFF** — see status.

**Status:** Live (events + Service Builder). Templates are **Live-but-flagged-OFF** (`templates` flag defaults `false`; `/admin/templates*`, `/admin/events/from-template`, and their APIs are gated in middleware + nav).

---

## Serving

**What it does:** Volunteer serving areas and sign-ups.

- Serving areas (per ministry), serving slots (date, max volunteers), member sign-up.
- Member-facing serving signup + "my signups".
- Atomic `signup_for_serving_slot()` RPC (migration 049) to prevent over-subscription races.
- Serving-area leaders (migration 025).

**Status:** Live.

---

## Songs / Worship

**What it does:** Worship song library and full-screen presenter.

- Song CRUD; per-song display settings; SongsTable + SongForm + presenter.
- **Shared / global song library** — songs with `church_id = NULL` are global; publish-to-global flow; scoped-or-global read RLS (migrations 066–073). Cross-church write IDOR fixed (migration 073).
- Arabic-normalized full-text song search with snippets and prefix matching (migrations 067–071, 090). The ~11k-song hymnal (owned by one church) is searchable cross-church after the search RPC's internal church filter was removed (migration 090, **applied to prod 2026-07-11**).
- Full-screen `/presenter/songs` for projection.

**Status:** Live. (The `song_presenter` flag defaults **ON**.)

---

## Bible

**What it does:** Bible reader with local text, search, and personal marks.

- Bible reader + chapter content + book selector; full-screen `/presenter/bible`.
- Local Bible text storage + plain-text content (migrations 010–012).
- Trigram search with Arabic alef/hamza normalization (migrations 013–014).
- Per-user bookmarks + highlights, church-scoped, migrated onto `apiHandler` with IDOR fixes.

**Status:** Live.

---

## Announcements

**What it does:** Church-wide announcements.

- Announcement CRUD; draft / published / archived; pinned announcements.
- Member-facing announcement list + admin management (AnnouncementCard/Form/Actions).

**Status:** Live.

---

## Prayer

**What it does:** Prayer requests (group-level and church-wide).

- Prayer request submission; private vs public; assignment to members (migration 026).
- "I'm praying" responses on prayer requests (migration 061).
- Admin prayer management + assign dialog.
- Church-wide prayers separate from group prayers (`church_prayers`, migration 025).

**Status:** Live.

---

## Outreach

**What it does:** Home/hospital visit tracking and accountability.

- Outreach visits with log-visit dialog + visit history (migration 025).
- Outreach assignments — assign members to outreach leaders for accountability (migration 060).
- RLS fix for outreach visits (migration 053).

**Status:** Live. (Gated by `outreach_module` flag, which defaults **ON**.)

---

## Notifications / Messaging

**What it does:** Multi-channel notifications.

- In-app notifications (bell, list, composer, audience/scopes).
- Push notifications via Firebase Cloud Messaging (`push_tokens`, migration 032b).
- Multi-channel dispatcher: in-app + push + email (Resend) + WhatsApp.
- **WhatsApp notification channel is a per-church paid opt-in** — `churches.whatsapp_notifications_enabled` defaults `false`; when off, recipients fall back to free push + in-app (migration 080). This is separate from WhatsApp OTP/verification.
- Notification retention/cleanup cron + index (migrations 054); cron writes to `notifications_log`.

**Status:** Live (in-app + push always on; WhatsApp notifications default OFF per church, opt-in in settings).

---

## Community Needs

**What it does:** Cross-church marketplace where churches post needs and other churches respond.

- `church_needs` + `church_need_responses`; cross-church RLS + storage bucket (migration 035).
- Inter-church messaging threads on accepted responses (`church_need_messages`, migration 043) + read receipts (migration 044).
- "Your Needs" tab (own needs dashboard with response counts).
- Notifications: response received, response status changed, new message.
- Gated by `can_view_church_needs` permission.

**Status:** Live.

---

## Liturgy

**What it does:** Coptic liturgical resources.

- Agpeya hours, psalmody, lectionary readings, clergy-only resources (migration 065).

**Status:** Live. (Gated by `liturgy_module` flag, which defaults **ON**.)

---

## Finance

**What it does:** Full double-entry church accounting (built, not launched).

- Fiscal years, chart of accounts (hierarchical), designated funds, bank accounts.
- Double-entry `financial_transactions` + `transaction_line_items`.
- Donations, expense request/approval workflow, campaigns (with thermometer), pledges, budgets + line items, deposit batches (migration 030).
- Member "My Giving" history.
- Atomic finance RPCs (create/update transaction with balance validation + posted-tx immutability), finance performance indexes (migrations 034, 051, 055).

**Status:** **Live-but-flagged-OFF (in-development).** The `finance` flag defaults `false`. Middleware redirects `/admin/finance/*` and `/finance/my-giving`, and returns 404 for all `/api/finance/*`; finance nav items are hidden. Per `CLAUDE.md`, finance has deeper schema/code drift (budget creation + double-entry transactions still fail) and must be reconciled before re-enabling. **Do not assume finance works.** Re-enable with `NEXT_PUBLIC_FEATURE_FINANCE=true`.

---

## Permissions / RBAC

**What it does:** Layered role + permission system.

- Roles: `super_admin`, `ministry_leader`, `group_leader`, `member`.
- Permissions resolve in layers: hardcoded role defaults → per-church role defaults → user-specific additive overrides; `super_admin` always gets everything (migration 024, `lib/permissions.ts`).
- `role_permission_defaults`, per-user permission overrides, `permission_audit_log`, general `audit_log`.
- Admin UIs: role permissions, per-user permission overrides (both server-guarded to `super_admin`).
- Nav is permission-aware (`getNavForUser` filters by role + permission + feature flag).

**Status:** Live.

---

## Onboarding / Auth

**What it does:** Church + member onboarding, sign-in, and approval gates.

- Email/password auth (Supabase); self-service signup; post-signup onboarding flow.
- **Password reset** — `/forgot-password` + `/reset-password` (recovery token exchanged client-side).
- **Phone / WhatsApp OTP login** — Supabase Send-SMS auth hook delivers Supabase-generated OTPs via the Meta WhatsApp Cloud API; signature-verified hook (`/api/auth/sms-hook`). **Live e2e is blocked externally on Meta WABA payment validation** — see project memory.
- **Concierge church onboarding** — registration creates a **pending** church (hidden from search); a platform operator approves it. Pending church renders a restricted shell (profile + settings + tutorials only) until approved (`churches.status`, migration 079).
- **Member-join approval** — every self-signup membership is forced `status='pending'` by the `handle_new_user` trigger until a church admin approves (migration 088). Two pre-approved doors: church founder (register sets `active`) and leader pre-add (sets `managed`/`invited`).
- Membership lifecycle statuses: `active` / `managed` / `invited` / `pending` / `inactive` (migrations 082, 084, 088). Cross-church "add existing person" creates an `invited` (consent-required) membership; the invitee accepts/declines via `/api/churches/invitations`.
- **Multi-church** membership + church switcher; login lands in last church; in-app "join another church" request flow (migration 031). Church-switch uses the admin client after verifying active membership (works around the self-role-escalation trigger).
- Membership access gate: only an **active** membership grants app access (`isActiveMembership`, `lib/membership.ts`).

**Status:** Live for email/password + approval gates. **Partial** overall: phone/WhatsApp OTP is code-complete but blocked on external Meta payment setup; **migrations 087 + 088 were not yet applied to prod** as of the last CLAUDE.md update (self-signups get instant access until 088 lands) — check current DB state.

---

## Platform-admin (Ekklesia Admin)

**What it does:** Cross-church operator hub for approving new churches and managing approvers.

- `/platform` hub: pending-church approval queue + approver management (migrations 079, 087).
- `isPlatformAdmin` = email in `PLATFORM_ADMIN_EMAILS` env bootstrap (un-removable owner) **OR** row in the `platform_admins` table (`lib/platform.ts`).
- `/api/platform/*` uses the service-role client; `platform_admins` is RLS deny-all to anon/authenticated.
- Not role-based — the "Ekklesia Admin" nav entry is appended only for platform admins, never leaking to church roles.

**Status:** Live via env allowlist (`PLATFORM_ADMIN_EMAILS` is set in prod). DB-managed approvers require migration 087 applied to prod.

---

## Analytics

**What it does:** Privacy-first product analytics.

- PostHog (EU residency), event catalog in `lib/analytics/events.ts` (50+ events), provider, user identification, error-boundary tracking.
- Rule: never call `posthog.capture()` directly; every event carries `church_id`, `role`, `locale` and never PII; track only on confirmed success.
- Analytics-coverage audit script.

**Status:** Live (prod key verification is a pending launch item).

---

## Infra / Testing

**What it does:** The platform, CI, and test scaffolding under the app.

- Next.js 15 App Router (Turbopack dev), PWA (`@ducanh2912/next-pwa`), offline fallback.
- Centralized `apiHandler` (auth + roles + permissions + rate-limit + Server-Timing + errors); Zod validation on inputs.
- Distributed rate limiting via Upstash Redis with in-memory fallback.
- Security headers, `/api/health`, structured logger.
- **Isolated staging Supabase** (`ekklesia-staging`) + migration/seed scripts guarded by `assertNotProd()`; `npm run dev:staging` on port 3100.
- Tests: ~1079 unit tests (Vitest) + Playwright e2e (permission enforcement, finance-off, onboarding gate, public visitor intake, persona matrix); GitHub Actions CI.
- Non-negotiables enforced by agents: 0 TS errors, 0 RTL violations, i18n parity across `en` / `ar` / `ar-eg`.

**Status:** Live.

---

## How to read this

- **`CLAUDE.md` §15 (Change Log) is the authoritative running history** — every completed task appends a dated row with the exact files touched. This DELIVERED doc is a by-module rollup and will lag behind it.
- **`CLAUDE.md` §5 (Migrations Applied)** is the canonical list of DB migrations and which are applied to staging vs prod. A migration existing in `supabase/migrations/` does **not** mean it is applied to prod — check the "APPLIED" notes there.
- **Feature flags decide what is actually reachable.** A module can be fully built and still be dark. See [`docs/FEATURE_FLAGS.md`](./FEATURE_FLAGS.md) and `lib/features.ts`.
- When docs disagree with code, **trust the code** (`lib/features.ts`, `middleware.ts`, `lib/navigation.ts`, the migration files).
