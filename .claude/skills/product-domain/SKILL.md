---
name: ekklesia-product-domain
description: Product domain knowledge for the Ekklesia church management app — roles, permissions, multi-tenancy, feature flags, visitor flow, finance, notifications, Bible module, and analytics.
---

# Skill: Product Domain — Ekklesia

Church management platform for Arabic-speaking churches, primarily in Egypt. Arabic is the primary language. Target devices are budget Android/iOS phones (360-390px screens) on 3G networks. Non-profit context — every feature serves a real church community.

---

## The application

Ekklesia helps churches manage: members, visitors, groups/ministries, events, volunteering/serving, finance (double-entry accounting), Bible reading, notifications, announcements, songs/worship, outreach visits, prayer requests, and a cross-church needs marketplace.

---

## The 4 roles

```typescript
type UserRole = 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
```

| Role | Who they are | Access level |
|---|---|---|
| `member` | Regular church member | View events, groups, Bible, personal giving, announcements, prayer |
| `group_leader` | Small group leader | Everything member + manage their group, gatherings, attendance, assigned visitors |
| `ministry_leader` | Ministry head (worship, youth, etc.) | Everything group_leader + manage their ministry, serving areas, create events |
| `super_admin` | Church admin / pastor | Full access — finance, members, permissions, all admin features |

`super_admin` bypasses ALL permission checks.

### Granular permissions (the real keys)

Beyond role-based access there are granular permission keys. These are the **actual keys** defined in `lib/permissions.ts` (`ALL_PERMISSIONS`) and typed as `PermissionKey` in `types/index.ts` — every key starts with `can_`:
- `can_view_members`, `can_manage_members`, `can_view_member_phone`
- `can_view_visitors`, `can_manage_visitors`
- `can_manage_events`, `can_manage_templates`
- `can_manage_serving`, `can_manage_announcements`, `can_manage_songs`, `can_manage_outreach`
- `can_view_reports`, `can_view_prayers`
- `can_view_church_needs`, `can_manage_church_needs`
- `can_view_finances`, `can_manage_finances`, `can_manage_donations`, `can_view_own_giving`, `can_manage_budgets`, `can_approve_expenses`, `can_submit_expenses`, `can_manage_campaigns`, `can_reconcile_bank`
- `can_manage_liturgy`, `can_manage_locations`, `can_book_locations`

> There is NO `manage_finance` / `view_finance` / `send_notifications` key — those are stale names. Use the `can_*` keys above.

### Permission resolution — 3 layers (additive only)

```
Layer 1: Hardcoded role defaults (code — lib/permissions.ts)
    ↓
Layer 2: Church-level role defaults (DB — role_permission_defaults table)
    ↓
Layer 3: User-specific overrides (DB — profiles.permissions JSONB)
```

Resolved via `getCurrentUserWithRole()` / `requirePermission()` in `lib/auth.ts`. `apiHandler`
resolves the caller's permissions and enforces `requirePermissions` for you — you rarely check by hand.

Enforce permissions declaratively in routes (preferred):
```typescript
export const POST = apiHandler(async ({ supabase, churchId, profile }) => {
  // handler only runs if the caller has BOTH the role and every listed permission
}, { requireRoles: ['super_admin', 'ministry_leader'], requirePermissions: ['can_manage_finances'] })
```

---

## Multi-tenant architecture

Users can belong to multiple churches via the `user_churches` table.

**Every piece of data is scoped by `church_id` — always.**

```typescript
// Getting current user's active church context
const { profile, churchId } = await getCurrentUserWithRole()
// churchId = the church this session is scoped to

// EVERY query must include this
.eq('church_id', churchId)
```

Users switch churches at `/select-church`. The session updates to reflect the new active church.

---

## Feature flags

The real flag set + defaults live in `lib/features.ts` (`FeatureFlag` type + `DEFAULT_FLAGS`).
Env overrides use `NEXT_PUBLIC_FEATURE_<FLAG>=true|false`; per-church overrides come from the
`church_features` table via `isFeatureEnabledForChurch()`.

```typescript
import { isFeatureEnabled, isFeatureEnabledForChurch } from '@/lib/features'

// The actual flags (name → default):
// advanced_reporting → false   sms_notifications → false   api_access → false
// custom_fields → false        audit_log_ui → false        outreach_module → true
// song_presenter → true        liturgy_module → true
// finance → false   ← OFF (in development)   templates → false   ← OFF (pilot-gated)
```

> ⚠️ **`finance` is OFF and `templates` is OFF.** Both are gated in `middleware.ts` + navigation:
> the finance nav/pages/`/finance/my-giving` redirect and every `/api/finance/*` route returns 404;
> the templates nav/`/admin/templates*`/`/admin/events/from-template` + `/api/templates*` are gated
> the same way. Do NOT assume finance or templates are usable in a running app — treat both as
> in-development until re-enabled with `NEXT_PUBLIC_FEATURE_FINANCE=true` / `NEXT_PUBLIC_FEATURE_TEMPLATES=true`.

```typescript
// Synchronous (defaults + env override) — use for global gates
if (!isFeatureEnabled('finance')) return notFound()

// Per-church (DB-backed) — use when a church can toggle the feature
export const GET = apiHandler(async ({ supabase, churchId }) => {
  const on = await isFeatureEnabledForChurch(supabase, 'liturgy_module', churchId)
  if (!on) return Response.json({ error: 'Feature not enabled' }, { status: 403 })
})
```

---

## i18n — 3 locales, Arabic-first

```
en       — English (LTR)
ar       — Modern Standard Arabic (RTL) — formal, used in official content
ar-eg    — Egyptian Arabic dialect (RTL) — informal, used in conversational UI
```

~2,700+ translation keys organized by feature module (kept at parity across all 3 locale files).

Auto-detection: middleware reads Accept-Language header and geolocation, defaults to Arabic for Egypt.

Language stored in `lang` cookie.

Translation key structure:
```json
{
  "Common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": { "generic": "Something went wrong. Please try again." }
  },
  "Groups": {
    "title": "Groups",
    "action": { "create": "Create Group" },
    "emptyState": { "title": "No groups yet", "body": "...", "action": "Create Group" }
  }
}
```

---

## Visitor flow

```
Visitor fills public form at /join (QR code)
         ↓
visitors record created (status: 'new')
         ↓
Assigned to a group_leader (assigned_to field)
         ↓
Leader contacts visitor (contacted_at + contact_notes updated)
         ↓
SLA check: if not contacted within X days → cron escalates
         ↓
Converted to member (converted_to = profile_id) OR marked inactive
```

Visitor statuses: `new` → `assigned` → `contacted` → `converted` | `inactive`

---

## Group / gathering flow

Groups meet regularly (weekly, bi-weekly, monthly).
Gatherings are the actual meeting instances.

```
Group created (weekly meeting, leader assigned)
         ↓
Gathering created for a specific date/time
         ↓
Members mark attendance (present / absent / excused)
         ↓
Prayer requests submitted by members
         ↓
Leader closes gathering with notes
```

```typescript
// Key tables:
// groups — the recurring group
// gatherings — one specific meeting (group_id FK)
// attendance — per-member record for a gathering
// prayer_requests — submitted during a gathering or independently
```

---

## Finance module — double-entry accounting

> ⚠️ **Finance is currently FLAGGED OFF (in development).** The whole surface is unreachable in a
> running app — middleware redirects the pages and returns 404 for `/api/finance/*`. It also has
> known schema/code drift (budget creation + some transactions still fail). The rules below describe
> the intended design; do not assume finance works today. Re-enable on staging with
> `NEXT_PUBLIC_FEATURE_FINANCE=true` when reconciling it.

**This is real financial data. Treat with extreme care.**

### Core concepts

**Accounts** — chart of accounts (assets, liabilities, income, expenses). Hierarchical (parent_id).

**Funds** — designated money pools. `is_restricted = true` means the money can only be used for the fund's specific purpose.

**Financial transactions** — every money movement. Each transaction has:
- Header: date, description, total_amount, status, payment_method
- Line items: debit_amount + credit_amount per account (MUST balance: sum(debits) = sum(credits))

**Donations** — linked to a transaction + fund + optional campaign.

**Campaigns** — fundraising campaigns with a goal amount and deadline.

**Budgets** — annual/period budgets with monthly allocations per account.

### Payment methods
`cash` | `bank_transfer` | `check` | `online` | `in_kind`

### Transaction statuses (approval workflow)
```
draft → pending_approval → approved → posted
                        ↘ rejected
                           ↘ voided
```

A `posted` transaction CANNOT be modified. It can only be reversed with a new transaction.

### Double-entry rule — enforced before every insert
```typescript
const totalDebits = lineItems.reduce((sum, item) => sum + (item.debitAmount ?? 0), 0)
const totalCredits = lineItems.reduce((sum, item) => sum + (item.creditAmount ?? 0), 0)
if (Math.abs(totalDebits - totalCredits) > 0.001) {
  return Response.json({ error: 'Transaction not balanced' }, { status: 422 })
}
```

### Fund restriction rule — enforced before allocation
```typescript
const { data: fund } = await supabase.from('funds').select('is_restricted, name').eq('id', fundId).single()
if (fund?.is_restricted && purposeNotMatchingFund) {
  return Response.json({ error: 'Cannot use restricted fund for this purpose' }, { status: 422 })
}
```

---

## Notification channels

4 channels, all go through `lib/messaging/triggers.ts` → provider pattern:

| Channel | Provider file | When used |
|---|---|---|
| `in_app` | `lib/messaging/providers/in-app.ts` | Always — stored in notifications_log |
| `push` | `lib/messaging/providers/push.ts` | When user has FCM token + opted in |
| `email` | `lib/messaging/providers/email.ts` | For important alerts, weekly summaries |
| `whatsapp` | `lib/messaging/providers/whatsapp.ts` | For churches that prefer WhatsApp |

Never call providers directly. Always use triggers:
```typescript
import { sendGroupGatheringReminder } from '@/lib/messaging/triggers'
await sendGroupGatheringReminder({ gathering, group, members })
```

---

## Cron jobs (3 daily at 8 AM)

```
/api/cron/gathering-reminders  — reminds group leaders of upcoming gatherings
/api/cron/visitor-sla          — escalates visitors not contacted within SLA
/api/cron/event-reminders      — reminds event registrants before events
```

Secured by `CRON_SECRET` Bearer token (not Supabase auth).
Process ALL churches — must filter by church_id on every query.
Must be idempotent — safe to run multiple times without duplicate notifications.

---

## Community needs marketplace

Cross-church feature — churches can post needs and other churches can respond.

Visibility: needs are visible to all churches.
Responses: one response per church pair (UNIQUE need_id + responder_church_id).
Messages: threaded conversation between two churches per response.

```typescript
// Key tables:
// church_needs — created_by church_id (visible to all)
// church_need_responses — responder_church_id (one per church)
// church_need_messages — sender_church_id (the conversation)
// church_need_message_reads — tracks last read timestamp
```

---

## Bible module

Bible text stored locally in the database (not fetched from external API at read time).
Multiple Bible versions — users choose their preferred version (`profiles.preferred_bible_id`).

```typescript
// Key tables:
// bible_versions — list of available Bibles
// bible_books, bible_chapters, bible_verses — full Bible text
// bible_cache — cached rendered chapters
// bible_bookmarks — per user per verse
// bible_highlights — per user per verse with color
```

---

## Newer modules (know these exist)

The app has grown well past the original MVP. Migrations run through **091** today
(`supabase/migrations/`). Modules added since the early docs:

- **Service Builder (event run-of-show).** `event_segments` has a `kind` column
  (`generic` | `song` | `bible` | `file`). A run-of-show item can BE a song (present via
  `/presenter/songs`), a Bible passage (`/presenter/bible`), or an uploaded slide deck / PDF
  (public `service-attachments` storage bucket). See migration 091 + `app/(app)/admin/events/`.
- **Community needs marketplace** — cross-church needs + responses + threaded messaging (see its own
  section below). Migrations 035/036/042/043/044.
- **Shared song hymnal** — songs can be church-scoped OR global (`church_id` nullable); a church can
  publish a song to the global library. The seeded hymnal is ~11k songs. Search runs Arabic
  normalization + lyrics full-text under the caller's RLS. Migrations 066–073, 090.
- **Coptic liturgy module** — Agpeya hours, psalmody, lectionary readings, clergy-only resources.
  Gated by the `liturgy_module` flag. Migration 065.
- **Locations & room bookings** — availability checks + "my bookings". Migration 064.
- **Onboarding-approval model** — church onboarding is concierge (request → platform-operator
  approve; `churches.status` pending/active/rejected/inactive). Member joins need church-admin
  approval (`user_churches.status` active/managed/invited/pending). Identity is phone/WhatsApp OTP
  with a claimable "shadow identity" for leader-added members. Platform approvers are managed via
  `platform_admins` + `PLATFORM_ADMIN_EMAILS`. Migrations 078/079/082/084/087/088. See
  `ONBOARDING_PLAN.md`.
- **Per-church privacy + channel controls** — `member_directory_visibility` (who sees member phones)
  and `whatsapp_notifications_enabled` (opt-in for the paid WhatsApp channel). Migrations 080/081.

---

## Auth and session flow

```
Request hits middleware.ts
    ↓
getSession() — fast local JWT check (no network)
    ↓
If no session → redirect to /login
    ↓
API routes / Server Components call getUser() — server-side verification
    ↓
getCurrentUserWithRole() — resolves user + profile + church + permissions
    ↓
Session stored in httpOnly cookies via Supabase SSR
```

**getSession() vs getUser():**
- `getSession()` = fast, local JWT validation. Can be spoofed with a manipulated JWT.
- `getUser()` = server-side verification against Supabase. Cannot be spoofed.
- Middleware uses `getSession()` (performance). API routes MUST use `getUser()` (security).

---

## Analytics — PostHog typed event catalog

```typescript
import { trackEvent } from '@/lib/analytics/events'

// ALWAYS use the typed catalog — never raw posthog.capture()
await trackEvent('group_created', { churchId, groupType: group.type })
await trackEvent('donation_recorded', { churchId, amount: Math.round(amount) })
// NEVER include: names, emails, phones, exact donation amounts (round to nearest 100)
```

Event naming: `{module}_{action}_{object}` — e.g., `group_created`, `member_invited`, `donation_recorded`

PII protection rules (enforced in event catalog):
- Never include names, email, phone
- Round financial amounts to nearest 100 (for privacy)
- Never include prayer request content

---

## Performance context — always remember

**Target users:**
- Budget Android/iOS phones (360-390px screens)
- Egyptian 3G networks (100-500ms RTT, 1-5 Mbps)
- Battery-conscious (animations should respect `prefers-reduced-motion`)

**What this means for code:**
- `Promise.all` for parallel Supabase queries — each sequential call = +300ms
- `loading.tsx` on every page — blank screen = "app is broken"
- Specific `.select()` fields — `select('*')` sends unnecessary data over slow connections
- Minimal JS bundle — unnecessary `"use client"` directives increase download size
- Touch targets minimum 44px — budget phones have larger screen pixel ratios
- `pb-20 md:pb-0` on page content — bottom navigation is always present on mobile