---
name: product-domain
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

### 22 granular permissions

Beyond role-based access, there are granular permissions:
- `view_members`, `manage_members`, `manage_member_roles`
- `view_visitors`, `manage_visitors`
- `view_events`, `manage_events`
- `view_serving`, `manage_serving`
- `view_finance`, `manage_finance`, `approve_finance`
- `send_notifications`

### Permission resolution — 3 layers (additive only)

```
Layer 1: Hardcoded role defaults (code — lib/permissions.ts)
    ↓
Layer 2: Church-level role defaults (DB — role_permission_defaults table)
    ↓
Layer 3: User-specific overrides (DB — profiles.permissions JSONB)
```

Called via: `getCurrentUserWithRole()` in `lib/auth.ts`
Returns: `{ user, profile, churchId, resolvedPermissions }`

Check permissions in routes:
```typescript
export const POST = apiHandler(async ({ profile }) => {
  if (!profile.permissions?.manage_finance) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
}, { requireRoles: ['super_admin', 'ministry_leader'] })
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

Per-church feature toggles stored in `church_features` table.
Check before rendering feature-gated content:

```typescript
import { isFeatureEnabled } from '@/lib/features'

// Features that can be toggled per church:
'finance'      // Full financial management module
'community'    // Cross-church needs marketplace
'bible'        // Bible reader with bookmarks/highlights
'serving'      // Volunteering/serving slot management
'outreach'     // Visitor and outreach tracking
```

```typescript
// In Server Components
const hasFinance = await isFeatureEnabled(churchId, 'finance')
if (!hasFinance) return notFound()

// In API routes
export const GET = apiHandler(async ({ churchId }) => {
  const hasFeature = await isFeatureEnabled(churchId, 'community')
  if (!hasFeature) return Response.json({ error: 'Feature not enabled' }, { status: 403 })
})
```

---

## i18n — 3 locales, Arabic-first

```
en       — English (LTR)
ar       — Modern Standard Arabic (RTL) — formal, used in official content
ar-eg    — Egyptian Arabic dialect (RTL) — informal, used in conversational UI
```

~1,904 translation keys organized by feature module.

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