# Ekklesia — Product Specification

> Canonical product spec, derived from the codebase. Cross-check against `CLAUDE.md`
> (overview, schema, migrations, change log). Source files are cited inline.
> For architecture/how-it-works, see `docs/SYSTEM_DESIGN.md`.
>
> **Last updated: 2026-07-14** · Migration ceiling: **091** (Service Builder).
> **Current status:** deployed and **live on `miaekklesia.com`** (Vercel + Cloudflare DNS),
> **pre-pilot** — code-complete and ready for the first pilot with known church leaders, not
> publicly launched. Finance is **OFF** (flagged, in development); event templates are **OFF**
> (flagged, pilot-not-ready). Prod is gated on applying migrations 087–088 (approver-from-UI +
> member-approval queue); the platform-operator allowlist already works via the
> `PLATFORM_ADMIN_EMAILS` env var (`CLAUDE.md` §10).

---

## 1. Overview & vision

Ekklesia is a **church-management platform built Arabic-first for Arabic-speaking churches** (Egypt-first), delivered as a **mobile-first PWA** on Next.js 15 (App Router) + Supabase (Postgres). It handles the operational life of a congregation: members, visitors, small groups, ministries, gatherings & attendance, events with service planning, serving/volunteering, announcements, songs & worship presentation, Bible reading, prayer, home/hospital outreach, Coptic liturgy, room bookings, notifications, a cross-church "Church Needs" marketplace, and finance (built but currently off). (`CLAUDE.md` §1, §4.)

**Platform model — one SaaS, many churches (multi-tenant):** a single deployment serves many churches. Every row is scoped by `church_id`, isolated by Postgres RLS, and every query filters on it (`CLAUDE.md` §13 rule 12; `lib/auth.ts`). One person is one identity that can hold memberships in several churches and switch between them (`types/index.ts` `UserChurchMembership`; church switcher).

**Who it's for:** Arabic (RTL) is the primary language with an English toggle; the target device is a **budget Android/iOS phone on 3G** (`CLAUDE.md` §7–8). Status: pre-launch, piloting with known church leaders.

---

## 2. User types

Four in-app roles (`type UserRole` in `types/index.ts`) plus two non-role actors.

- **super_admin** — full access to everything in their church: all admin pages, members, finance, church settings, role-permission defaults, and per-user permission overrides. Always resolves to every permission regardless of configuration (`resolvePermissions` short-circuits for `super_admin`, `lib/permissions.ts`). Typically the church's first/provisioned admin.
- **ministry_leader** — admin-level operator for ministry operations: events, templates, serving, visitors, calendar, locations, and expense approval. Cannot manage permissions or church settings (those nav items are `super_admin`-only, `lib/navigation.ts`). Can approve member self-sign-up join requests.
- **group_leader** — leads one small group: My Group, gatherings, attendance, assigned visitors ("My Visitors"), can view reports and church needs, submit expenses, and book rooms. No member-directory or management access by default (`HARDCODED_ROLE_DEFAULTS.group_leader`, `lib/permissions.ts`).
- **member** — regular congregant: dashboard, profile, events, serving signup, Bible, liturgy, announcements, prayer, notifications, and (when finance is on) their own giving. Everything else is gated behind permission flags, all `false` by default.

Non-role actors:

- **Public visitor** — unauthenticated. Fills the public QR/visitor intake form at `/join` and views the church landing page at `/welcome` (`app/(public)/`). No account required; lands in the visitor pipeline.
- **Platform operator** — the people running the SaaS. Identified **by email from two sources** (`lib/platform.ts` `isPlatformAdmin`, which is **async**): (1) the `PLATFORM_ADMIN_EMAILS` env var — the bootstrap owner, configured out-of-band and un-removable via the UI so the founder can never be locked out; **OR** (2) a row in the `platform_admins` table (migration 087), where approvers are added at runtime from the Ekklesia admin UI (read via the service-role client, since RLS denies normal clients). `isEnvPlatformAdmin()` is the env-only check used to protect the bootstrap owner from removal. This deliberately sits **outside** the church RBAC system. Platform operators approve brand-new churches they are not members of, via `/platform/churches` and `/api/platform/churches`, and manage the approver list via `/api/platform/admins`.

---

## 3. Capability matrix

Rows = every key in `ALL_PERMISSIONS`; columns = the default from `HARDCODED_ROLE_DEFAULTS` (`lib/permissions.ts`). ✓ = granted by default, ✗ = denied by default.

| Permission key | member | group_leader | ministry_leader | super_admin |
|---|:---:|:---:|:---:|:---:|
| `can_view_members` | ✗ | ✗ | ✗ | ✓ |
| `can_manage_members` | ✗ | ✗ | ✗ | ✓ |
| `can_view_member_phone` | ✗ | ✗ | ✗ | ✓ |
| `can_view_visitors` | ✗ | ✓ | ✓ | ✓ |
| `can_manage_visitors` | ✗ | ✗ | ✓ | ✓ |
| `can_manage_events` | ✗ | ✗ | ✓ | ✓ |
| `can_manage_templates` | ✗ | ✗ | ✓ | ✓ |
| `can_manage_serving` | ✗ | ✗ | ✓ | ✓ |
| `can_manage_announcements` | ✗ | ✗ | ✗ | ✓ |
| `can_view_reports` | ✗ | ✓ | ✓ | ✓ |
| `can_manage_songs` | ✗ | ✗ | ✗ | ✓ |
| `can_view_prayers` | ✗ | ✗ | ✗ | ✓ |
| `can_manage_outreach` | ✗ | ✗ | ✗ | ✓ |
| `can_view_church_needs` | ✗ | ✓ | ✓ | ✓ |
| `can_manage_church_needs` | ✗ | ✗ | ✗ | ✓ |
| `can_view_finances` | ✗ | ✗ | ✗ | ✓ |
| `can_manage_finances` | ✗ | ✗ | ✗ | ✓ |
| `can_manage_donations` | ✗ | ✗ | ✗ | ✓ |
| `can_view_own_giving` | ✓ | ✓ | ✓ | ✓ |
| `can_manage_budgets` | ✗ | ✗ | ✗ | ✓ |
| `can_approve_expenses` | ✗ | ✗ | ✓ | ✓ |
| `can_submit_expenses` | ✗ | ✓ | ✓ | ✓ |
| `can_manage_campaigns` | ✗ | ✗ | ✗ | ✓ |
| `can_reconcile_bank` | ✗ | ✗ | ✗ | ✓ |
| `can_manage_liturgy` | ✗ | ✗ | ✗ | ✓ |
| `can_manage_locations` | ✗ | ✗ | ✓ | ✓ |
| `can_book_locations` | ✗ | ✓ | ✓ | ✓ |

**Resolution model (additive):** permissions resolve in three layers — **hardcoded role default → per-church role default → user-specific override** — merged by `resolvePermissions` (`lib/permissions.ts`). Church defaults live in `role_permission_defaults`; user overrides live in `profiles.permissions` (JSONB). **User overrides are additive only: they can grant (`true`) but never revoke.** `super_admin` always gets everything and ignores the layers. Changes are audited in `permission_audit_log` (`types/index.ts`).

**Phone-visibility call-out:** `can_view_member_phone` is now **admin-only by default** (only `super_admin` has it hardcoded true) and is **grantable** per-leader through the church-default or user-override layers. It is enforced alongside the church-level `member_directory_visibility` setting (`'everyone' | 'leaders_only' | 'hidden'`, default `'leaders_only'`, migrations 081/082) — a church setting that strips member phone numbers from directory pages and member APIs for anyone not entitled to see them (`CLAUDE.md` change log Q2; `types/index.ts` `Church.member_directory_visibility`).

---

## 4. Modules & features

Every module below is live and wired unless noted. Nav gating (roles + permission + feature flag) is defined in `lib/navigation.ts`; routes live under `app/(app)/`.

| Module | What it does | Primary users |
|---|---|---|
| **Members** | Member directory + detail (milestones, involvement, attendance history, at-risk). Phone visibility gated by `can_view_member_phone` + `member_directory_visibility`. Admin can add members by name/phone (shadow identity). | super_admin (view/manage); leaders per grant |
| **Visitors** | Public QR intake at `/join` (per-church configurable form, migration 056) → visitor pipeline (new→assigned→contacted→converted/lost), SLA escalation, leader assignment ("My Visitors"). | ministry_leader (manage), group_leader (assigned), public (submit) |
| **Groups** | Small-group CRUD; membership; join requests (request→approve, migration 058); "My Group" for group leaders. | super_admin (admin), group_leader (own group), member (join) |
| **Gatherings & attendance** | Group meeting instances; attendance roster (present/absent/excused/late), swipe attendance; per-gathering prayer list. | group_leader (record), member (attend) |
| **Ministries + meetings** | Ministry teams with member management, ministry meetings (migration 059), action items/tasks (migration 063), and ministry-scoped notifications. | ministry_leader, super_admin |
| **Events + service planning + Service Builder** | Events with a **run-of-show** builder ("Service Builder", migration 091): each segment can be a plain item, a **song** (present via `/presenter/songs`), a **Bible passage** (`/presenter/bible`), or an **uploaded slide deck/PDF/image** (public `service-attachments` bucket); "Add to service" from the Songs & Bible pages. Plus service needs & volunteer assignments (assigned/confirmed/declined) with role presets; members express serving interest (service requests, migration 062); calendar view. **Event templates** (reusable events with recurrence + custom fields) exist but are **flagged OFF** — see §8. | ministry_leader (manage), member (register/serve) |
| **Serving** | Serving areas & slots (max volunteers), member self-signup, area leaders; atomic signup RPC. | member (sign up), ministry_leader (manage) |
| **Announcements** | Church announcements (draft/published/archived, pinned, expiry); member-facing feed. | super_admin (manage), all (read) |
| **Songs + shared hymnal + presenter** | Song CRUD with per-song display settings; a **cross-church shared/global song library** — an ~11,000-song hymnal readable by every church (publish to global, scoped+global read, migrations 066–073; cross-church search fixed in migration 090 — Arabic-normalized + lyrics full-text + prefix, live on prod); full-screen worship **presenter**. | super_admin (manage), all (view/present) |
| **Bible** | Bible reader with bookmarks & highlights, trigram + Arabic-normalized search, full-screen Bible presenter. | all members |
| **Prayer** | Member prayer-request submission (private/anonymous options); admin prayer management with assignment to members; "I'm praying" responses (migration 061). | member (submit), super_admin (manage) |
| **Outreach + assignments** | Home/hospital visit tracking with follow-ups; assign members to outreach leaders for accountability (migration 060). | super_admin / outreach-granted leaders |
| **Community needs (cross-church)** | Marketplace where churches post needs and **other churches** respond; inter-church messaging threads on accepted responses; "Your Needs" tab. The one deliberately cross-tenant surface (PII-stripped). | any church (post/respond) per `can_view_church_needs` |
| **Liturgy** | Coptic liturgical resources: Agpeya hours, psalmody, lectionary readings, hymns, clergy-only resources; bookmarks; liturgy presenter (migration 065). Behind `liturgy_module` flag (default on). | all members; super_admin (manage) |
| **Locations / bookings** | Rooms/locations with capacity & features; room bookings with availability conflict checks; "my bookings" (migration 064). | ministry_leader (manage), leaders (book) |
| **Notifications** | In-app notification center + bell; multi-channel dispatch (in-app, push, email, WhatsApp) with audience/scoping; scheduled cron jobs (event/gathering reminders, visitor SLA, cleanup). | all members |

**Finance — BUILT but flagged OFF and unreachable.** The full double-entry finance module exists (accounts, funds, donations, expenses, campaigns, pledges, budgets, transactions, fiscal years, my-giving; `types/index.ts` finance types; migration 030). It is gated behind the `finance` feature flag (**default off**, `lib/features.ts`): middleware redirects `/admin/finance/*` and `/finance/my-giving` and returns 404 for all `/api/finance/*`; finance nav items are hidden. It is treated as in-development (deeper schema/code drift). Re-enable with `NEXT_PUBLIC_FEATURE_FINANCE=true` once reconciled (`CLAUDE.md` header warning).

**Event templates — BUILT but flagged OFF.** The event-template surface (recurrence, custom fields, template segments; migrations 021/023) is gated behind the `templates` feature flag (**default off**, `lib/features.ts`) exactly like finance: middleware redirects `/admin/templates*` and `/admin/events/from-template` and returns 404 for `/api/templates*` and `/api/events/from-template`; template nav items are hidden. Enable with `NEXT_PUBLIC_FEATURE_TEMPLATES=true` (set on staging/local). Note that the underlying `can_manage_templates` permission still defaults true for leaders (§3) — it's the *surface* that's gated, not the permission.

---

## 5. Onboarding model

Reference: `ONBOARDING_PLAN.md` (decided model; concierge churches, phone/WhatsApp-OTP identity, leader-add + claim, request→approve lifecycle).

**Church lifecycle (concierge, operator-gated):** a public "request your church" form creates a **pending** church → a **platform operator** verifies the requester and approves it. `churches.status` = `pending | active | rejected | inactive` (migration 079). A pending church is hidden from search (`is_active=false`), its requester lands on a `/pending-church` "under review" screen (gated by the `(app)` layout), and approval flips it to active and provisions the first `super_admin`. Operator approval runs at `/platform/churches` → `/api/platform/churches` (service-role, scoped to `status='pending'`), gated by the async `isPlatformAdmin()` check (`lib/platform.ts` — `PLATFORM_ADMIN_EMAILS` env bootstrap **or** a `platform_admins` row; see §2). Registration itself never self-approves (SEC fix in change log).

**Member lifecycle** — `user_churches.status` = `active | managed | invited | inactive | pending` (migration 082 introduced the first four; migration 084 added `invited`; migration 088 added **`pending`**). Only `active` grants app access to a church; `isActiveMembership()` denies `managed`/`invited`/`inactive`/`pending` at the auth boundary (`lib/auth.ts`, `lib/membership.ts`). The statuses:

- **`active`** — full access to that church.
- **`managed`** — a leader-created shadow identity that nobody has claimed yet (no login).
- **`invited`** — a cross-church invite awaiting the person's own consent before it activates.
- **`pending`** — a **self-signup awaiting church-admin approval**. Migration 088 rewrote `handle_new_user` so every self-signup membership is forced to `pending`; the person has **no app access** until an approver acts, and lands on `/membership-pending` instead of the app shell. The two pre-approved doors set their own status *after* the trigger runs (church founder → `active` via the register upsert; leader pre-add → `managed`/`invited` via `/api/members`).
- **`inactive`** — a membership that has been switched off.

Two doors into one lifecycle:

- **Door 1 — leader-add + OTP-claim.** A `super_admin`/`ministry_leader` adds a member by name (+ optional phone) via `POST /api/members` → creates a **claimable shadow identity** (a phone-only `auth.admin.createUser` user, `status='managed'`). The person later **claims** it via WhatsApp OTP; `POST /api/members/claim` flips their own `managed` memberships → `active` and stamps `phone_verified_at`. A **pre-added phone = pre-approval** (auto-claim, no queue).
- **Door 2 — self-signup + leader approve.** A person signs up; an **unknown phone** enters the church join-request queue (`church_join_requests`, migration 078). Approvers are `super_admin` + `ministry_leader` (`/admin/join-requests`); approval grants the membership.
- **Cross-church invite → accept.** Joining a second church uses the same doors; the `invited` status covers a cross-church invite awaiting the person's consent before it activates.

Phone-uniqueness (Supabase global + a unique partial index on `profiles.phone`) gives **dedupe-by-phone for free**: an existing phone becomes an added membership on the same identity rather than a duplicate user.

---

## 6. Identity & auth

- **Email/password (live).** Supabase Auth; session via cookies; `getUser()` for secure verification. Login at `/login`, self-service signup at `/signup` (`app/(auth)/`).
- **WhatsApp OTP (built, pending external config).** Phone OTP sign-in: a Supabase **Send-SMS auth hook** (`app/api/auth/sms-hook`) delivers Supabase-generated OTPs via the **Meta WhatsApp Cloud API directly** (no Twilio/BSP; auth-category template). Standard-Webhooks HMAC-SHA256 signature verified, **fails closed (403)**. UI is Email/Phone tabs on login (`components/auth/PhoneLoginForm.tsx`). **Live use is blocked on Meta WABA + Supabase phone-provider config** (`CLAUDE.md` change log A1).
- **One phone = one person.** Phone is a changeable credential but globally unique, enforcing one-human-one-login and enabling the leader-add/claim dedupe (§5).
- **Multi-church.** One identity holds many memberships (`user_churches`, migration 031); `profiles.church_id` marks the active one. Users pick/switch via `/select-church` and the church switcher; the authoritative per-church role is `user_churches.role`, cross-referenced on every load to prevent stale-role escalation (`lib/auth.ts`).

---

## 7. Multi-tenancy & security model

- **`church_id` scoping everywhere.** Every table carries `church_id`; every query filters on it; RLS is enabled on all tables and enforces isolation at the database (`CLAUDE.md` §5, §13 rule 12).
- **apiHandler spine.** All API routes run through `apiHandler` (`lib/api/handler.ts`), which centralizes auth, role enforcement, permission checks, membership-status gating, Server-Timing, and error handling; inputs are validated with Zod schemas (`lib/schemas/`). Manual auth is not written per-route.
- **Rate limiting.** Tiered (strict/normal/relaxed) via Upstash Redis with in-memory fallback (`lib/api/rate-limit.ts`), applied in `apiHandler`.
- **Defense in depth.** Effective role is read from `user_churches` (not stale `profiles.role`); a self-role-escalation trigger, scoped RLS policies, and PII-stripping on the one cross-tenant surface (community needs) harden the model (`CLAUDE.md` change log).

---

## 8. Feature flags

Defined in `lib/features.ts` (env override `NEXT_PUBLIC_FEATURE_<FLAG>=true|false`; async per-church via `church_features`):

- **`finance` — OFF (default).** Whole finance surface gated in middleware + nav; unreachable until reconciled (§4).
- **`templates` — OFF (default).** Whole event-template surface gated in middleware + nav, mirroring finance; enable with `NEXT_PUBLIC_FEATURE_TEMPLATES=true` (§4).
- **`liturgy_module`, `song_presenter`, `outreach_module` — ON (default).** Live modules.
- **`advanced_reporting`, `sms_notifications`, `api_access`, `custom_fields`, `audit_log_ui` — OFF (default).**
- **WhatsApp notifications — per-church opt-in (paid).** `churches.whatsapp_notifications_enabled` (default `false`, migration 080). Cost-control gate: default is **free push + in-app only**; a recipient's `notification_pref='whatsapp'` falls back to push+in-app unless the church opts in. Does **not** affect WhatsApp OTP/verification. Managed at `/admin/settings/notifications`.
- **Directory phone privacy — per-church setting.** `churches.member_directory_visibility` (`everyone | leaders_only | hidden`, default `leaders_only`, migration 081), managed at `/admin/settings/privacy` (see §3 call-out).

---

## 9. Integrations

- **Firebase Cloud Messaging (FCM) push** — free push channel; tokens in `push_tokens`; service worker generated at build. (`CLAUDE.md` §2.)
- **WhatsApp Cloud API (Meta)** — OTP delivery via the Supabase Send-SMS hook (§6); optionally the paid notification channel when a church opts in (§8).
- **PostHog analytics** — EU/privacy-first; all events go through the event catalog (`lib/analytics/events.ts`); required dims `church_id`, `role`, `locale`; never PII.
- **Resend email** — optional transactional email channel.
- **Supabase** — Postgres + Auth + Storage (profile photos, attachments). Hosted on Vercel as a PWA.

---

## 10. Non-functional requirements

- **i18n.** Three locales at full parity — English (`en`), Modern Standard Arabic (`ar`), Egyptian Arabic (`ar-eg`) — via next-intl, cookie-based locale (`messages/*.json`). No hardcoded UI strings; keys added to all three files.
- **RTL.** Arabic is primary; RTL is mandatory. Tailwind logical properties only (`ms/me/ps/pe`, `text-start/end`, `start/end`), directional icons `rtl:rotate-180`, numbers/currency forced `dir="ltr"`. RTL-violation grep must return 0 (`CLAUDE.md` §7, §13 rule 2).
- **Mobile / 3G.** Target budget Android/iOS at 360–390px on 3G with 2–4GB RAM: 44px touch targets, tables get mobile card fallbacks, heavy components dynamically imported, all list pages paginate at 25, every page ships a matching `loading.tsx` (`CLAUDE.md` §8).
- **PWA / offline.** Installable PWA (`@ducanh2912/next-pwa`) with an offline fallback (`/offline`) and offline banner.

---

*Ground truth: `CLAUDE.md`, `lib/permissions.ts`, `types/index.ts`, `lib/navigation.ts`, `lib/features.ts`, `lib/auth.ts`, `lib/membership.ts`, `lib/platform.ts`, `ONBOARDING_PLAN.md`, and the `app/` route tree.*
