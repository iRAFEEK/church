# Ekklesia — Project Context

> This file is auto-maintained. Every agent that completes a task must update the relevant sections.
> Last updated: 2026-06-22 | Updated by: Pre-launch hardening + finance flagged off + onboarding role fixes (migrations 056–076)

> ⚠️ **FINANCE IS OFF.** The finance module is gated behind a feature flag (`finance`, default off in `lib/features.ts`) and **unreachable** — middleware redirects `/admin/finance/*` and `/finance/my-giving`, and returns 404 for all `/api/finance/*`. It is treated as in-development (it has deeper schema/code drift: budget creation + double-entry transactions still fail). Re-enable with `NEXT_PUBLIC_FEATURE_FINANCE=true` once reconciled. Do not assume finance works.

---

## Startup Ritual — Read This First

Every agent must do this before starting any task:

```bash
# 1. Confirm you are in the right repo
ls package.json next.config.ts CLAUDE.md

# 2. Check current git state
git branch --show-current
git status

# 3. Read the relevant skill for your task (see Section 14)
cat .claude/skills/code-quality/SKILL.md    # for code work
cat .claude/skills/optimization/SKILL.md    # for performance work
```

Do not skip step 3. The skills contain patterns that are not repeated in this file.

---

## Engineering Agent System

This project has a full multi-agent engineering system in `.claude/`.

### Modes

**Investigate / Audit** — triggered by: "find", "audit", "analyze", "what's wrong", "go over"
- Reads the relevant agent from `.claude/agents/`
- Walks actual files, finds actual line numbers
- Reports only — never modifies anything
- Output written to `.claude/output/`

**Code** — triggered by: "fix", "work on", "implement", "build", any task description
- Reads `.claude/agents/coding-agent.md` first
- Reads ALL 4 skill files before touching anything
- Applies the same standards every time regardless of task source

**Build a feature** — triggered by: "build the X feature", "implement Y from scratch"
- Reads `.claude/agents/feature-builder.md`
- Coordinates the full team: security review, DB review, UX review, then builds
- Every feature gets: migration + RLS + apiHandler routes + loading.tsx + i18n + tests

### Agent roster

| What you say | Agent |
|---|---|
| fix, work on, implement, build, any task | `coding-agent.md` |
| build a feature end-to-end | `feature-builder.md` |
| deep codebase investigation | `00-archaeologist.md` |
| architecture, patterns, structure | `01-architecture.md` |
| quality, bug, any, null, error | `02-quality.md` |
| security, auth, IDOR, data leak | `03-security.md` |
| performance, slow, 3G, loading | `04-performance.md` |
| database, RLS, index, migration | `05-database.md` |
| tests, coverage, debt | `06-tests-debt.md` |
| full audit, everything | all agents via `07-cto.md` orchestrator |
| code review, review changes | `code-reviewer.md` |
| optimize recently changed files | `optimize-after-feature.md` |
| seed test data for a feature | `seed-feature.md` |
| UX review or design spec | `ux-designer.md` |

### Non-negotiable rules (enforced by all agents)

- Every query: `.eq('church_id', churchId)` — no exceptions
- Every API route: `apiHandler` — never manual auth
- Every string: `t('key')` — never hardcoded English
- Every new page: `loading.tsx` — users are on 3G
- Zero new `any` types — 270+ already exist
- Finance data: validate before touching

### Skills location

`.claude/skills/` — read these before making any code change

| Skill file | When to read |
|---|---|
| `fix-standards/SKILL.md` | Before any fix, refactor, or code change |
| `component-patterns/SKILL.md` | Before writing any React component |
| `data-patterns/SKILL.md` | Before writing any API route, query, or DB work |
| `product-domain/SKILL.md` | Before working on any feature (understand the domain) |
| `code-quality/SKILL.md` | For code quality and structure patterns |
| `optimization/SKILL.md` | For performance optimization patterns |
| `ux-design/SKILL.md` | For UX design patterns and standards |
| `analytics/SKILL.md` | For PostHog analytics instrumentation |
| `context-update/SKILL.md` | After completing ANY task (mandatory) |

---

## 1. What This Project Is

Ekklesia is a church management platform built for Arabic-speaking churches (primarily Egypt). It handles member management, visitor tracking, group/ministry coordination, events, serving, finance, Bible reading, notifications, announcements, songs/worship, outreach, and prayer requests. Arabic is the primary language with English toggle support.

**Status:** Pre-launch. Deployed to Vercel for testing. Ready for pilot with known church leaders. Not publicly released yet.

---

## 2. Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15.3.x App Router | Turbopack in dev, PWA enabled |
| Database | Supabase (PostgreSQL) | RLS enabled on all tables |
| Storage | Supabase Storage | Profile photos, attachments |
| Auth | Supabase Auth | Session via cookies, `getUser()` for secure verification |
| Language | TypeScript 5.x | strict mode via tsconfig |
| Styling | Tailwind CSS 3.4.x | CSS variables for theming (shadcn pattern) |
| UI Components | shadcn/ui + Radix UI | Custom components in `components/ui/` |
| i18n | next-intl 4.x | Arabic (ar, ar-eg) + English (en), cookie-based locale |
| Push Notifications | Firebase Cloud Messaging | Service worker generated at build time |
| Email | Resend | Optional, for transactional emails |
| Analytics | PostHog | EU data residency, privacy-first config |
| Charts | Recharts 3.x | Always dynamically imported |
| Virtualization | @tanstack/react-virtual | For long lists |
| Forms | react-hook-form + zod | With @hookform/resolvers |
| Hosting | Vercel | PWA with @ducanh2912/next-pwa |

---

## 3. User Roles

| Role | Description | Key Routes | Notes |
|------|------------|-----------|-------|
| `super_admin` | Full access to everything | All routes, all admin pages, permissions, settings, finance | Can manage role permission defaults per church |
| `ministry_leader` | Admin-level access for ministry operations | Events, templates, serving, visitors, finance (approval) | Cannot manage permissions or church settings |
| `group_leader` | Leads a small group | My Group, gatherings, attendance, assigned visitors | Can submit expenses, view reports |
| `member` | Regular church member | Dashboard, profile, events, serving, bible, announcements, prayer, my-giving | Access controlled by permission flags |

Permissions are resolved in layers: hardcoded role defaults -> church-level role defaults -> user-specific overrides (additive only). `super_admin` always gets all permissions.

---

## 4. Directory Structure

```
app/
├── (app)/                  # Authenticated app layout (AppShell, BottomNav, Sidebar)
│   ├── admin/
│   │   ├── announcements/  # CRUD announcements
│   │   ├── events/         # Event management + service planning + templates
│   │   ├── finance/        # Finance module (dashboard, donations, expenses, funds, accounts, budgets, campaigns, transactions, reports, settings)
│   │   ├── groups/         # Group CRUD
│   │   ├── members/        # Member list + detail with milestones, involvement, attendance
│   │   ├── ministries/     # Ministry CRUD with member management
│   │   ├── outreach/       # Outreach visits and tracking
│   │   ├── permissions/    # Per-user permission overrides
│   │   ├── prayers/        # Prayer request management (admin)
│   │   ├── serving/        # Serving areas + slots management
│   │   ├── settings/       # QR code, role permissions
│   │   ├── songs/          # Song CRUD + presenter
│   │   ├── templates/      # Event template management
│   │   └── visitors/       # Visitor queue management
│   ├── announcements/      # Member-facing announcements
│   ├── bible/              # Bible reader + bookmarks
│   ├── community/needs/    # Church Needs marketplace (cross-church) with "Your Needs" tab + messaging
│   ├── dashboard/          # Role-based dashboards
│   ├── events/             # Member-facing event list + detail
│   ├── finance/my-giving/  # Member's own giving history
│   ├── groups/             # Group detail + gathering management
│   ├── my-group/           # Group leader's group page
│   ├── notifications/      # Notification center
│   ├── prayer/             # Prayer request submission
│   ├── profile/            # Profile view + edit
│   ├── serving/            # Member-facing serving signup
│   └── visitors/           # Leader's assigned visitors
├── (auth)/                 # Unauthenticated layout
│   ├── login/              # Email/password login
│   ├── signup/             # Self-service account creation
│   └── select-church/      # Church picker for multi-church users
├── (public)/               # Public pages (no auth required)
│   ├── join/               # QR visitor form + success page
│   └── welcome/            # Church landing page + registration wizard
├── api/                    # ~80 API routes organized by resource
│   ├── announcements/      # Announcement CRUD
│   ├── bible/              # Bible API proxy + bookmarks/highlights
│   ├── church-prayers/     # Church prayer management
│   ├── churches/           # Church search, join, register, switch
│   ├── community/needs/    # Church Needs CRUD + responses + messaging (cross-church)
│   ├── cron/               # Scheduled jobs (event reminders, visitor SLA)
│   ├── events/             # Events + segments + service needs + assignments
│   ├── finance/            # Donations, expenses, funds, accounts, budgets, campaigns, transactions, fiscal years, my-giving
│   ├── gatherings/         # Gathering CRUD + attendance + prayer
│   ├── groups/             # Group CRUD + members + gatherings
│   ├── ministries/         # Ministry CRUD + members + events + notifications
│   ├── notifications/      # Notification CRUD + send + audience + scopes
│   ├── outreach/           # Outreach visits
│   ├── permissions/        # Permission management + audit log + role defaults
│   ├── profiles/           # Profile CRUD + attendance + involvement + milestones + at-risk
│   ├── push/               # FCM push subscribe/unsubscribe/test
│   ├── serving/            # Serving areas + slots + signup
│   ├── songs/              # Song CRUD + display settings
│   ├── templates/          # Event template CRUD + needs + segments
│   ├── visitors/           # Visitor CRUD + escalations
│   └── webhooks/           # WhatsApp webhook
├── onboarding/             # Post-signup onboarding flow
├── offline/                # PWA offline fallback page
└── presenter/              # Full-screen presenter (Bible, songs)
lib/
├── api/
│   ├── handler.ts          # Centralized API route wrapper (auth, roles, permissions, timing, errors)
│   └── validate.ts         # Zod request body validation helper
├── schemas/                # Zod schemas: announcement, event, gathering, group, notification, profile, serving, song, visitor
├── auth.ts                 # getCurrentUserWithRole(), requireRole(), requirePermission()
├── config.ts               # Validated env config via Zod
├── permissions.ts          # Permission resolution (hardcoded -> church defaults -> user overrides)
├── features.ts             # Feature flag system (per-church toggles)
├── audit.ts                # Audit logging utility
├── navigation.ts           # Role/permission-aware nav items
├── scope.ts                # Data scope helpers
├── absence.ts              # Absence tracking logic
├── bible/                  # Bible constants + queries
├── dashboard/queries.ts    # Dashboard data queries
├── design/tokens.ts        # Design tokens
├── firebase/               # Firebase admin + client setup
├── hooks/                  # usePushNotifications
├── landing/queries.ts      # Landing page queries
├── analytics/              # PostHog analytics (client, server, event catalog)
├── messaging/              # Multi-channel messaging (email, push, in-app, WhatsApp)
├── supabase/
│   ├── client.ts           # Browser Supabase client (no Database generic)
│   └── server.ts           # Server Supabase client with cookie handling
├── utils.ts                # cn() utility
├── utils/                  # normalize, search, storage helpers
└── help/                   # Help registry + walkthrough system
types/
├── index.ts                # All domain types (Profile, Church, Donation, etc.)
├── database.ts             # Manual DB types (placeholder for Supabase CLI generated types)
└── dashboard.ts            # Dashboard-specific types
components/
├── admin/                  # QR generator
├── announcements/          # AnnouncementCard, AnnouncementForm, AnnouncementActions
├── bible/                  # BibleReader, BiblePresenter, BookSelector, ChapterContent, etc.
├── dashboard/              # AdminDashboard, LeaderDashboard, MemberDashboard, MinistryLeaderDashboard, StatCard, charts
├── events/                 # EventCard, EventForm, EventsPageClient, SegmentEditor, ServiceNeedsPicker, TemplateForm, etc.
├── finance/                # AmountCell, CampaignThermometer, CurrencyDisplay, FinanceSkeleton, FinanceTabBar, etc.
├── gathering/              # AttendanceRoster, GatheringHistory, NewGatheringForm, PrayerList, SwipeAttendance
├── groups/                 # GroupForm, GroupMemberManager, GroupsTable, RegisterLeaderDialog
├── help/                   # HelpCard, TeachMeButton, TeachMeWalkthrough
├── landing/                # Church landing page components
├── layout/                 # AppShell, BottomNav, Sidebar, Topbar, MoreSheet, ChurchSwitcher
├── marketing/              # Product marketing page components
├── ministries/             # MinistriesTable, MinistryForm, MinistryMemberManager
├── notifications/          # NotificationBell, NotificationComposer, NotificationList, PushPermissionPrompt
├── outreach/               # OutreachDashboard, LogVisitDialog, VisitHistoryList
├── permissions/            # MemberPermissionEditor, PermissionToggleGrid
├── prayer/                 # ChurchPrayerCard, ChurchPrayerForm, ChurchPrayerList, PrayerAssignDialog
├── profile/                # PhotoUpload, MemberRoleEditor, AttendanceHistory, MemberInvolvementCard, AddMilestone
├── registration/           # RegistrationWizard with multi-step church registration flow
├── serving/                # ServingAreaCard, ServingSlotCard, ServingSlotForm, MySignups, etc.
├── shared/                 # OfflineBanner
├── songs/                  # SongForm, SongPresenter, SongsTable
├── ui/                     # shadcn/ui primitives (button, card, dialog, input, select, etc.)
└── visitors/               # VisitorQueue, LeaderVisitorList
messages/
├── en.json                 # English translations
├── ar.json                 # Arabic translations
└── ar-eg.json              # Egyptian Arabic translations
supabase/
├── migrations/             # 43 migration files (see Section 5)
└── seeds/                  # Feature-specific test data (run manually, idempotent)
    └── [feature].sql       # One file per feature
.claude/
├── settings.json           # Claude Code hooks (post-feature optimization trigger)
├── agents/
│   ├── optimize-after-feature.md  # Optimization agent prompt template
│   ├── seed-feature.md            # Feature seeding + edge case testing agent
│   └── ux-designer.md             # UX review + design spec agent
├── scripts/
│   ├── post-feature-optimize.sh   # Hook trigger script
│   ├── optimize-now.sh            # Manual optimization trigger
│   ├── seed-feature.sh            # Feature seeding trigger
│   └── ux-review.sh               # UX designer agent runner
├── logs/                   # Gitignored — auto-optimize run logs
└── skills/                 # Claude Code skills
    ├── optimization/       # Performance optimization patterns
    ├── code-quality/       # Code quality and structure patterns
    ├── context-update/     # How to update this file after completing work
    └── ux-design/                  # Senior UX designer patterns
```

---

## 5. Database Schema

### Core Tables

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `churches` | Church organizations | id, name, name_ar, country, timezone, primary_language, denomination, default_currency, fiscal_year_start_month | Yes |
| `profiles` | User profiles (one per auth user per church) | id, church_id, first_name, last_name, *_ar, role, status, permissions (JSONB), onboarding_completed | Yes |
| `user_churches` | Multi-church membership | user_id, church_id, role, joined_at | Yes |
| `church_leaders` | Church leadership display | church_id, name, name_ar, title, title_ar, photo_url, display_order | Yes |
| `visitors` | Visitor pipeline | church_id, first_name, last_name, phone, status (new/assigned/contacted/converted/lost), assigned_to | Yes |
| `ministries` | Ministry teams | church_id, name, name_ar, leader_id, is_active | Yes |
| `ministry_members` | Ministry membership | ministry_id, profile_id, church_id, role_in_ministry | Yes |
| `groups` | Small groups | church_id, ministry_id, name, type, leader_id, meeting_day/time/frequency | Yes |
| `group_members` | Group membership | group_id, profile_id, church_id, role_in_group | Yes |
| `gatherings` | Group meeting instances | group_id, church_id, scheduled_at, status, topic | Yes |
| `attendance` | Meeting attendance records | gathering_id, profile_id, church_id, status (present/absent/excused/late) | Yes |
| `prayer_requests` | Prayer submissions | church_id, submitted_by, content, is_private, status, assigned_to | Yes |
| `notifications` | In-app notifications | church_id, profile_id, title, body, is_read | Yes |
| `church_need_messages` | Inter-church messaging on need responses | response_id, sender_user_id, sender_church_id, message, message_ar | Yes (both parties) |
| `events` | Church events | church_id, title, title_ar, starts_at, ends_at, event_type, is_public, registration_required | Yes |
| `event_registrations` | Event RSVPs | event_id, profile_id, status | Yes |
| `event_segments` | Run-of-show segments | event_id, title, duration_minutes, sort_order | Yes |
| `event_service_needs` | Service planning needs | event_id, ministry_id, volunteers_needed, role_presets (JSONB) | Yes |
| `event_service_assignments` | Volunteer assignments | service_need_id, profile_id, status (assigned/confirmed/declined), role | Yes |
| `event_templates` | Reusable event templates | church_id, name, event_type, recurrence_type, custom_fields (JSONB) | Yes |
| `event_template_needs` | Template service needs | template_id, ministry_id, volunteers_needed | Yes |
| `event_template_segments` | Template segments | template_id, title, duration_minutes, sort_order | Yes |
| `songs` | Worship songs | church_id, title, title_ar, lyrics, lyrics_ar, display_settings (JSONB) | Yes |
| `serving_areas` | Serving ministry areas | church_id, ministry_id, name, name_ar | Yes |
| `serving_slots` | Individual serving opportunities | serving_area_id, church_id, title, date, max_volunteers | Yes |
| `serving_signups` | Volunteer signups for slots | slot_id, profile_id, church_id, status | Yes |
| `announcements` | Church announcements | church_id, title, title_ar, body, status (draft/published/archived), is_pinned | Yes |
| `bible_bookmarks` | User Bible bookmarks | profile_id, church_id, bible_id, book_id, chapter_id, verse_id | Yes |
| `bible_highlights` | User verse highlights | profile_id, church_id, verse_id, color | Yes |

### Permissions & Audit Tables

| Table | Purpose |
|-------|---------|
| `role_permission_defaults` | Per-church role permission configurations |
| `permission_audit_log` | Audit trail for permission changes |
| `audit_log` | General audit log for sensitive operations |
| `church_features` | Per-church feature flag toggles |

### Finance Tables

| Table | Purpose |
|-------|---------|
| `fiscal_years` | Church fiscal year periods |
| `accounts` | Chart of accounts (hierarchical) |
| `funds` | Designated funds (general, building, missions, etc.) |
| `bank_accounts` | Church bank accounts |
| `financial_transactions` | Double-entry transaction headers |
| `transaction_line_items` | Debit/credit line items per transaction |
| `donations` | Individual donation records (linked to transactions, funds, campaigns) |
| `expense_requests` | Expense request/approval workflow |
| `campaigns` | Fundraising campaigns with goals and progress |
| `pledges` | Donor pledge commitments |
| `budgets` | Budget periods with line items |
| `budget_line_items` | Monthly budget amounts per account |
| `deposit_batches` | Deposit batch processing |

### Push Notification Tables

| Table | Purpose |
|-------|---------|
| `push_tokens` | FCM push notification tokens per user |

### Outreach Tables

| Table | Purpose |
|-------|---------|
| `church_prayers` | Church-wide prayer requests (separate from group prayers) |
| `outreach_visits` | Home/hospital visit tracking |
| `serving_area_leaders` | Serving area leadership assignments |

### Migrations Applied

| # | File | Description |
|---|------|-------------|
| 001 | foundation.sql | Core tables: churches, profiles, trigger functions |
| 002 | rls_policies.sql | Row-level security policies for all core tables |
| 003 | seed_test_data.sql | Test church + users seed data |
| 004 | phase2_visitors_groups.sql | Visitors, ministries, groups, group_members tables |
| 005 | phase3_gatherings_attendance_prayer.sql | Gatherings, attendance, prayer_requests tables |
| 006 | notifications.sql | Notifications table + indexes |
| 007 | events.sql | Events, event_registrations tables |
| 008 | songs.sql | Songs table |
| 009 | serving_announcements.sql | Serving areas/slots/signups, announcements tables |
| 010 | bible.sql | Bible bookmarks, highlights tables |
| 011 | bible_local.sql | Local Bible text storage |
| 012 | bible_text_plain.sql | Plain text Bible content |
| 013 | bible_trigram_search.sql | Trigram search index for Bible |
| 014 | normalize_alef.sql | Arabic alef normalization function |
| 015 | church_leaders.sql | Church leaders display table |
| 016 | denomination.sql | Church denomination field |
| 017 | event_service_planning.sql | Event service needs + assignments tables |
| 018 | ministry_upgrade.sql | Ministry enhancements |
| 019 | fix_ministry_members_rls.sql | Fix ministry_members RLS policies |
| 020 | event_service_roles.sql | Event service role presets |
| 021 | event_templates.sql | Event templates + template needs/segments |
| 022 | performance_indexes.sql | Performance indexes for common queries |
| 023 | template_enhancements.sql | Template recurrence, custom fields, segments |
| 024 | permissions_system.sql | Role permission defaults, permission audit log, user permission overrides |
| 025 | church_prayers_outreach.sql | Church prayers, outreach visits, serving area leaders |
| 026 | prayer_assignment.sql | Prayer request assignment to members |
| 027 | schema_hardening.sql | NOT NULL constraints, CHECK constraints, missing indexes |
| 028 | audit_log.sql | General audit log table |
| 029 | feature_flags.sql | Church feature flags table |
| 030 | financial_system.sql | Full financial system: fiscal years, accounts, funds, bank accounts, transactions, line items, donations, expenses, campaigns, pledges, budgets, deposit batches |
| 031 | multi_church.sql | Multi-church membership (user_churches table) |
| 032 | push_tokens.sql | Push notification tokens table |
| 033 | seed_finance_test_data.sql | Test data for finance module |
| 034 | finance_performance_indexes.sql | Compound indexes for finance queries |
| 035 | church_needs.sql | Church Needs marketplace: church_needs, church_need_responses tables, cross-church RLS, storage bucket |
| 036 | seed_church_needs_test_data.sql | Test data: 2 additional churches + admins, 8 needs, 6 cross-church responses |
| 042 | new_test_churches_and_needs.sql | 2 more test churches (Amman, Baghdad) + admins + 7 needs + 3 responses |
| 043 | church_need_messages.sql | church_need_messages table for inter-church messaging threads on accepted responses |
| 044 | church_need_message_reads.sql | Read receipts for church need messages |
| 045 | fix_rls_push_tokens_notifications.sql | RLS fix scoping push_tokens + notifications |
| 046 | missing_fk_indexes.sql | Add missing foreign-key indexes |
| 047 | fund_deletion_restrict.sql | RESTRICT deletion of funds with dependents |
| 048 | handle_new_user_require_church.sql | New-user trigger requires a church |
| 049 | constraints_and_atomic_signup.sql | Unique constraints on event_registrations + bible_bookmarks, atomic signup_for_serving_slot() RPC |
| 050 | rls_hardening_and_index_fixes.sql | RLS policy hardening: self-role-escalation trigger, scoped push_tokens/notifications RLS, financial_transactions read/write split, index fixes, CHECK constraints on amounts, CASCADE→RESTRICT FKs |
| 051 | atomic_transaction_update.sql | Atomic update_transaction_with_items() RPC with SELECT FOR UPDATE, balance validation, posted tx immutability |
| 052 | drop_soft_delete_columns.sql | Drop unused soft-delete columns |
| 053 | outreach_visits_rls_fix.sql | RLS fix for outreach_visits |
| 054 | notification_retention_index.sql | Index supporting notification retention/cleanup |
| 055 | finance_atomic_rpcs.sql | Finance atomic RPC functions (create_transaction_with_items, activate_fiscal_year, switch_default_fund) |
| 056 | visitor_form_config.sql | Per-church visitor intake form configuration |
| 057 | default_groups_ministry.sql | Default groups / ministry provisioning |
| 058 | group_join_requests.sql | Group join requests (member request → leader approve/decline) |
| 059 | ministry_meetings.sql | Ministry meetings table |
| 060 | outreach_assignments.sql | Assign members to outreach leaders for accountability |
| 061 | prayer_responses.sql | "I'm praying" responses on prayer requests |
| 062 | event_service_requests.sql | Members express interest in serving (service requests) |
| 063 | standalone_action_items.sql | Standalone + meeting-linked action items / tasks |
| 064 | locations_and_bookings.sql | Locations + room bookings with availability checks |
| 065 | liturgical_resources.sql | Coptic liturgy: Agpeya hours, psalmody, lectionary readings, clergy resources |
| 066 | shared_song_library.sql | Make church_id nullable for global/shared songs |
| 067 | song_search_snippets.sql | Song full-text search snippet RPC |
| 068 | arabic_search_normalization.sql | Arabic normalization for song search |
| 069 | songs_global_access.sql | Global song read RLS (shared hymnal) |
| 070 | song_search_prefix.sql | Prefix matching in song search |
| 071 | songs_scoped_global.sql | Scoped + global song access RLS (own church OR NULL) |
| 072 | song_publish.sql | Publish a song to the global library (published_by_church_id) |
| 073 | fix_songs_update_scope.sql | **SECURITY:** scope song UPDATE to global-or-own-church + WITH CHECK (fixes cross-church write IDOR) |
| 074 | repair_schema_drift.sql | Add `funds.currency` + `budgets.currency` (code-required, never migrated), re-apply `songs.published_by_church_id`, drop 5 duplicate FKs (donations/campaigns/pledges/transaction_line_items.fund_id, event_registrations.event_id) that broke PostgREST embeds |
| 075 | fix_church_creator_role.sql | Backfill: promote `user_churches.role` to super_admin where `profiles.role` is super_admin but user_churches isn't (church creators were stuck as members) |
| 076 | sync_user_churches_role.sql | **Trigger** keeping `user_churches.role` (the authoritative per-church role) in sync with `profiles.role` on every change, + full backfill. Fixes the systemic role-desync that locked out registered admins/leaders |

> ⚠️ **Duplicate migration numbers on disk:** there are two `032_*` (`fix_songs_rls`, `push_tokens`) and two `033_*` (`seed_finance_test_data`, `songs_trigram_indexes`). They apply in filename order today, but renumber before this causes an ordering ambiguity in a fresh environment.

---

## 6. Architecture Patterns

Every agent must follow these patterns without exception. Do not invent alternatives.

### API Routes

All API routes use the centralized handler:

```ts
import { apiHandler } from '@/lib/api/handler'
import { validateBody } from '@/lib/api/validate'
import { donationSchema } from '@/lib/schemas/donation'

export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = await validateBody(req, donationSchema)
  // ... implementation
}, { requireRoles: ['ministry_leader', 'super_admin'] })
```

`apiHandler` provides: auth check, role enforcement, permission checks, Server-Timing headers, error handling. Never write these manually.

### Data Fetching in Server Components

```ts
// ALWAYS parallel — never sequential awaits for independent data
const [funds, accounts, members] = await Promise.all([
  getFunds(churchId),
  getAccounts(churchId),
  getMembers(churchId),
])
```

### Caching

```ts
import { unstable_cache } from 'next/cache'

const getData = unstable_cache(
  async (churchId: string) => { /* query */ },
  ['cache-key'],
  { tags: [`tag-${churchId}`], revalidate: 300 }
)

// Invalidate in mutation routes:
revalidateTag(`tag-${churchId}`)
```

Cache TTL guidelines:
- Aggregate dashboard summaries: 300s (5 min)
- Reference data (funds, accounts, groups): 3600s (1 hour)
- Member lists: 300s
- Finance lists (donations, transactions): 30s
- Finance reports: 600s (10 min)
- Real-time attendance: 0 (no cache)

### Pagination

All list queries must paginate. Never load unbounded rows.

```ts
const PAGE_SIZE = 25
const offset = (page - 1) * PAGE_SIZE

const { data, count } = await supabase
  .from('table')
  .select('col1, col2', { count: 'exact' })
  .eq('church_id', churchId)
  .order('created_at', { ascending: false })
  .range(offset, offset + PAGE_SIZE - 1)
```

### Zod Validation

All API inputs validated with Zod schemas from `lib/schemas/`. Never trust request bodies without validation.

### select() Narrowing

Never use `.select('*')` in production queries. Always specify exactly the columns needed.

### Error Handling

All errors flow through `apiHandler`. Never return raw error messages to the client. Never expose internal error details.

### Supabase Client

- Browser: `lib/supabase/client.ts` — do NOT use `<Database>` generic (causes `never` type errors)
- Server: `lib/supabase/server.ts` — uses CookieMethodsServer pattern with `setAll` typed as `{ name: string; value: string; options?: any }[]`

### Analytics

All analytics go through the event catalog. Never call `posthog.capture()` directly.

```ts
import { analytics } from '@/lib/analytics'
analytics.finance.donationRecorded({ church_id, role, locale, amount, currency, method, fund_id, has_campaign })
```

Every event requires: `church_id`, `role`, `locale`. Never include PII (names, emails, phone).
Track after confirmed success, never on attempt.
New events: add to `lib/analytics/events.ts`, follow `{module}_{action}_{object}` naming.

---

## 7. RTL / i18n Rules

**This is a bilingual app. Arabic is the primary language. RTL is not optional.**

Every agent must follow these rules in every file touched:

### Tailwind RTL — Required substitutions
| Never use | Always use |
|-----------|-----------|
| `ml-*` | `ms-*` |
| `mr-*` | `me-*` |
| `pl-*` | `ps-*` |
| `pr-*` | `pe-*` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `left-*` | `start-*` |
| `right-*` | `end-*` |
| `border-l-*` | `border-s-*` |
| `border-r-*` | `border-e-*` |
| `rounded-l-*` | `rounded-s-*` |
| `rounded-r-*` | `rounded-e-*` |

**Exceptions:** Currency amounts and numbers always use `dir="ltr"` explicitly (numbers don't mirror).

**Icons in RTL:** Directional icons (chevrons, arrows) need `rtl:rotate-180`:
```tsx
<ChevronRight className="h-4 w-4 rtl:rotate-180" />
```

**Inputs:** Always add `dir="auto"` to text inputs. Use `text-base` (16px minimum) to prevent iOS zoom.

**Translations:** All user-facing strings must use `useTranslations()` or `getTranslations()`. No hardcoded English strings in UI. Always add keys to all three files: `messages/en.json`, `messages/ar.json`, `messages/ar-eg.json`.

---

## 8. Mobile-First Rules

Target device: **budget Android/iOS phones, 360-390px screens, 3G network, 2-4GB RAM.**

- All touch targets minimum **44px** height
- Test every layout at **390px** width
- Tables that don't fit on mobile: use card list on mobile + `hidden md:block` on table
  ```tsx
  <div className="md:hidden space-y-2">{/* Mobile cards */}</div>
  <div className="hidden md:block">{/* Desktop table */}</div>
  ```
- Heavy components (recharts, etc.) always dynamically imported
- Every page must have `loading.tsx` with a skeleton that matches the page layout
- All list pages paginate at 25 items
- Form selects: `w-full sm:w-auto` — never fixed width on mobile

---

## 9. Performance Baseline

Last measured: 2026-03-11

| Route | Score | FCP | LCP | TTI | TBT | CLS |
|-------|-------|-----|-----|-----|-----|-----|
| /dashboard | 91 | 1.1s | 3.4s | 3.4s | 60ms | 0 |
| /notifications | 97 | 1.1s | 2.6s | 2.9s | 20ms | 0 |
| /admin/members | 95 | 1.1s | 2.9s | 3.0s | 20ms | 0 |
| /admin/finance | not yet measured | | | | | |
| /events | not yet measured | | | | | |

---

## 10. Current Work Status

### Completed
- [x] Phase 1: Foundation — auth, profiles, churches, middleware, onboarding
- [x] Phase 2: Visitors, ministries, groups, group members
- [x] Phase 3: Gatherings, attendance, prayer requests
- [x] Phase 4: Notifications, events, i18n system
- [x] Phase 5: Announcements, serving areas/slots/signups
- [x] Phase 6: Songs, worship presenter
- [x] Phase 7: Bible reader with bookmarks, highlights, search
- [x] Church leaders display, denomination support
- [x] Event service planning (needs, assignments, role presets)
- [x] Event templates with recurrence, custom fields, segments
- [x] Performance indexes (migration 022)
- [x] RBAC permissions system (role defaults, user overrides, audit log)
- [x] Church prayers, outreach visits, serving area leaders
- [x] Prayer assignment to members
- [x] Schema hardening (NOT NULL, CHECK constraints)
- [x] Audit log system
- [x] Feature flags (per-church toggles)
- [x] Financial system (full double-entry: accounts, funds, donations, expenses, campaigns, pledges, budgets, transactions)
- [x] Multi-church membership + church switching
- [x] Push notifications (FCM)
- [x] Finance performance indexes
- [x] Performance optimization rounds 1-5 (N+1 fixes, caching, pagination, indexes)
- [x] Architecture audit (apiHandler, Zod, type system, RLS hardening)
- [x] Mobile optimization rounds 1-3 (PWA, offline, virtualization, optimistic UI)
- [x] Mobile UX audit (responsive tables, back navigation, RTL pagination icons)
- [x] RTL violations fixed (51 violations resolved)
- [x] Finance dashboard optimization (Promise.all, caching, indexes)
- [x] Finance subpage optimization (pagination, form parallelization, loading.tsx, Suspense)
- [x] Church registration wizard
- [x] Product marketing landing page

- [x] Church Needs cross-church marketplace (needs, responses, permissions, 3 pages, 5 components, 4 API routes)
- [x] Church Needs notifications (need_response_received, need_response_status_changed, need_message)
- [x] Church Needs inter-church messaging (message threads on accepted responses)
- [x] Church Needs "Your Needs" tab (own needs dashboard with response counts)
- [x] Church Needs test data expansion (4 test churches total: Egypt, Jordan, Iraq + original)

- [x] Auto-optimization agent system (hooks + agent + scripts)
- [x] UX designer agent system (skill + agent + runner script)
- [x] Feature seeding agent (.claude/agents/seed-feature.md + seed-feature.sh)
- [x] PostHog analytics (full instrumentation: events catalog, provider, identification, error tracking, audit script, analytics skill)
- [x] Comprehensive test suite — 952 tests across 56 files (auth, permissions, messaging, API routes, smoke tests, utilities, middleware, church registration)
- [x] Security hardening Week 1: rate limiting in apiHandler (strict/normal/relaxed tiers), 2 IDOR fixes (bible bookmarks/highlights migrated to apiHandler with church_id), dev-login endpoint deleted, RTL violation fixed (0 remaining), 33 TypeScript errors fixed (0 remaining)
- [x] API standardization Week 2: migrated 63 routes to apiHandler (109/116 total, 94%). Added Zod schemas for ministries, templates, outreach. Fixed missing church_id filters on announcements [id], leaders/register, profiles attendance/involvement/milestones, push unsubscribe. Only churches/search remains manual (needs profile-optional). 952 tests passing.
- [x] Code reviewer agent: 525-line read-only agent with 32 automated checks across 8 categories, auto-triggered via Stop hook
- [x] Week 3 hardening: Zod validation on 18 remaining mutation routes (bible, push, churches, notifications, gatherings, events). 4 new schemas (bible, church, push, notification-send). 27 loading.tsx skeleton files. 14 select('*') narrowed to specific columns. 3 sequential await → Promise.all conversions. 952 tests passing, 0 TS errors.
- [x] Week 4 code quality: P1: 36 routes bounded with .limit() (no unbounded list queries remain). P2: 25 routes narrowed from select('*') to specific columns (0 select('*') in API routes). P3: 33 routes added revalidateTag after mutations. P4: ~80 any types replaced with proper types across 26 files (lib/, components/, API routes). 952 tests passing, 0 TS errors.
- [x] Week 5 polish: P1: 62 console.error/warn/log → structured logger across 34 files. P2: churches/search migrated to apiHandler with new profileOptional support (all routes now on apiHandler). P3: ~100 more any types replaced across 25 files (dashboard queries, finance pages, serving, events, community). Only 11 intentional any remaining. 952 tests passing, 0 TS errors.
- [x] UX critical fixes (Phase 1): 51 critical issues — dir="ltr" on ~40 currency amounts, rtl:rotate-180 on directional icons, ~50 hardcoded strings → t(), touch targets h-6→h-10/h-7→h-9, confirm()→AlertDialog, paddingInlineStart, locale-aware fmt(). 120+ keys. 52 files.
- [x] UX full fixes (Phase 2): 207 remaining issues — pb-24 on ~76 pages, finance responsive (px-4 md:px-6, grid-cols-1 sm:grid-cols-3), 6 AlertDialog confirmations, mobile overflow (events/templates/songs/Bible headers stack on mobile, visitor mobile cards), 8 empty states with icons+CTAs, dir="auto" on ~20 inputs, text-base iOS zoom, aria-label on ~15 buttons, text-[9px]→text-xs in 23 files, Help FAB icon, landing mobile menu, tabs dir fix, role badge translation, SongForm steps, MySignups deleted, dev buttons hidden in prod. ~90 keys. 151 files.
- [x] Production readiness audit — 60+ fixes across 4 waves: SEC (RLS hardening, PII stripping, sanitizeLikePattern, Zod on register, LIKE injection, cron auth), DB (unique constraints, atomic RPCs, CASCADE→RESTRICT, CHECK constraints, index fixes), ARCH (missing church_id filters, permission enforcement, atomic transaction updates), QUAL (double-submit guards, error.message leaks, double res.json(), finance FK validation), i18n (onboarding strings, BudgetForm placeholders, expense statuses, global-error bilingual), RTL (21 directional icons, Sheet component), UX (touch targets, prayer delete confirm), PERF (dashboard caching, conditional Sentry/Firebase, batched cron, error boundaries). 7 new migrations (049-055). 948 tests, 0 TS errors, 0 RTL violations.

- [x] Production readiness hardening — test credentials removed from prod bundle (login page), security headers added (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy), /api/health endpoint created, .env.example updated with Sentry vars. 948 tests, 0 TS errors.

### In Progress
- See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) (prioritized to-do), [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) (operational steps), and [supabase/REBUILD_AND_VERIFY.md](supabase/REBUILD_AND_VERIFY.md) (the #1 launch gate: clean DB rebuild + `npm run verify:schema`).

### Pre-launch decisions & fixes (2026-06-22)
- [x] **Finance flagged OFF** (in-development) — gated in middleware + nav; unreachable. See header warning.
- [x] **CRITICAL onboarding fixes** — church creators AND registered leaders were silently demoted to `member` (403 on all admin actions) because write paths set `profiles.role` but not the authoritative `user_churches.role`. Fixed at the source with a sync trigger (migration 076) + backfill (075) + register-route upsert. Verified live: fresh church + leader registration now work end-to-end.
- [x] **Schema-drift repair** (migration 074) + **schema verification gate** (`npm run verify:schema`, `scripts/verify-prod-schema.mjs`).
- [x] Onboarding verified: self-signup → correct member role/access; fresh church admin can use all core features.

### Additional completed modules (post-March, were undocumented)
- [x] Coptic liturgy module — Agpeya hours, psalmody, lectionary readings, clergy-only resources (migration 065)
- [x] Shared/global song library — cross-church song sharing + publish, scoped+global RLS (migrations 066–073)
- [x] Locations & room bookings — availability checks, "my bookings" (migration 064)
- [x] Ministry meetings + standalone action items/tasks (migrations 059, 063) — UI live in ministry detail
- [x] Outreach assignments — assign members to outreach leaders (migration 060) — UI live
- [x] Group join requests — request → approve/decline (migration 058)
- [x] "I'm praying" prayer responses (migration 061) — wired in PrayerFeedCard
- [x] Event service requests — members express serving interest (migration 062)
- [x] Per-church visitor intake form config (migration 056)
- [x] Distributed rate limiting via Upstash Redis with in-memory fallback (lib/api/rate-limit.ts)
- [x] vitest declared as devDependency (was undeclared); `npm test` / `npm run typecheck` scripts; GitHub Actions CI (.github/workflows/ci.yml)
- [x] i18n parity restored — ar + ar-eg complete to 2,558 keys; duplicate-key bug in en/ar message files fixed
- [x] SECURITY: fixed songs cross-church write IDOR (migration 073)

### Pending / Not Started
- [ ] Apply migrations to production Supabase project (now 001–073) — see OPERATIONS_RUNBOOK §1
- [ ] Rotate production keys; enable Upstash env vars — RUNBOOK §2–3
- [ ] Lighthouse baseline on production URL
- [ ] Sentry error monitoring + PostHog prod verification + DB backups/restore test
- [ ] Vercel Analytics + Speed Insights
- [ ] Real device testing: Android, Arabic mode, airplane mode, PWA install
- [ ] PWA icons — real brand icons (192px, 512px, maskable) — currently placeholders
- [x] e2e tests for critical paths (Playwright) — permission enforcement, finance-off, onboarding gate, public visitor intake (24 tests chromium+mobile, green against seeded DB; `e2e/`, env-gated, `npm run test:e2e`). Caught + fixed a real visitor-form blank-field bug. Still pending: full sign-up→complete-onboarding (mutates state) + two-church isolation.
- [ ] Capacitor for native app wrapper + FCM push notifications
- [ ] Finance module: bank reconciliation, recurring donations, donation receipts, Stripe online giving
- [ ] Supabase CLI type generation (replace manual types/database.ts)
- [ ] Renumber duplicate migrations (two 032_*, two 033_*)

---

## 11. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
DATABASE_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
RESEND_API_KEY=                    # Optional: email provider
RESEND_FROM_EMAIL=                 # Optional: sender address
WHATSAPP_API_KEY=                  # Optional: WhatsApp messaging
WHATSAPP_API_URL=                  # Optional: WhatsApp API endpoint
WHATSAPP_WEBHOOK_SECRET=           # Optional: webhook verification
CRON_SECRET=                       # Optional: cron job authentication
NEXT_PUBLIC_POSTHOG_KEY=           # PostHog project API key (public)
NEXT_PUBLIC_POSTHOG_HOST=          # https://eu.i.posthog.com or https://us.i.posthog.com
POSTHOG_PROJECT_API_KEY=           # Same as public key (server-side)
```

---

## 12. Key Commands

```bash
# Development
npm run dev

# Build (must produce 0 TypeScript errors)
npm run build

# Type check only
npx tsc --noEmit

# Generate Firebase service worker
npm run generate:sw

# Apply migrations locally
supabase db push

# Generate types from Supabase schema
npx supabase gen types typescript --local > types/supabase.ts

# Run all tests
npx vitest run

# Run tests for a specific module
npx vitest run lib/__tests__/
npx vitest run app/api/

# RTL violation check (must return 0)
grep -rn "\bml-[0-9]\|\bmr-[0-9]\|\btext-right\b\|\btext-left\b" \
  app/ components/ --include="*.tsx" | grep -v "//" | wc -l

# Bundle analysis
ANALYZE=true npm run build

# Manually trigger optimization agent on changed files
bash .claude/scripts/optimize-now.sh

# Manually trigger on a specific directory
bash .claude/scripts/optimize-now.sh app/\(app\)/admin/finance/

# View optimization log
cat .claude/logs/auto-optimize.log

# UX review on last changed files
bash .claude/scripts/ux-review.sh

# UX design spec for a new feature
bash .claude/scripts/ux-review.sh "build a recurring donations feature"

# UX review on a specific directory
bash .claude/scripts/ux-review.sh "" app/(app)/admin/finance/

# Seed the most recently built feature (auto-detects from git)
bash .claude/scripts/seed-feature.sh

# Seed a specific feature by name
bash .claude/scripts/seed-feature.sh "recurring donations feature"

# Seed a specific directory
bash .claude/scripts/seed-feature.sh "finance reports" app/(app)/admin/finance/reports/

# Re-run a saved seed file to reset test data
supabase db execute --file supabase/seeds/[feature].sql

# Run analytics coverage audit
bash .claude/scripts/analytics-audit.sh

# Code review on uncommitted changes
bash .claude/scripts/code-review.sh

# Code review on last commit
bash .claude/scripts/code-review.sh --last-commit

# Code review on all changes since diverging from main
bash .claude/scripts/code-review.sh --diff-main

# Code review on a specific directory
bash .claude/scripts/code-review.sh app/api/finance/
```

---

## 13. Conventions and Non-Negotiables

1. **TypeScript: 0 errors.** `npx tsc --noEmit` must pass before any task is considered done. No `// @ts-ignore`, no `any` unless absolutely unavoidable and documented.

2. **RTL: 0 violations.** Run the RTL grep check above. If you add any `ml-`, `mr-`, `text-left`, `text-right`, `pl-`, `pr-`, `left-`, `right-` without an RTL equivalent, you are breaking Arabic for every user.

3. **No hardcoded English strings.** All user-facing text goes through `useTranslations()` / `getTranslations()`. Add translation keys to `en.json`, `ar.json`, and `ar-eg.json`.

4. **No `.select('*')` in production queries.** Always narrow.

5. **No sequential awaits for independent data.** Always `Promise.all`.

6. **No unbounded list queries.** Always paginate with `.range()`.

7. **All new API routes use `apiHandler`.** Never write auth/role/rate-limit logic manually.

8. **All new API inputs validated with Zod.** Schema goes in `lib/schemas/`.

9. **Every new page needs `loading.tsx`.** Skeleton must match the page layout.
   **Exception:** Pages that immediately redirect (e.g., `/` → `/dashboard`), purely static pages with no server data, and pages whose parent layout already provides a loading state do not need their own `loading.tsx`. Document any exception with a comment.

10. **Every table must have a mobile card list fallback.** No table-only layouts.

11. **Supabase client: no `<Database>` generic.** Causes `never` type errors until CLI types are generated.

12. **All data queries filter by `church_id`.** Multi-tenant — never leak data across churches.

13. **Middleware cookie `setAll` typed as `{ name: string; value: string; options?: any }[]`.** Required for Supabase SSR compatibility.

14. **Analytics is part of done.** Every form submission, primary CTA, and key user action needs an analytics call from the event catalog (`lib/analytics/events.ts`). No uninstrumented features. Read `.claude/skills/analytics/SKILL.md`.

---

## 14. Skills — Read Before You Start

**Before writing any code for your task, read the relevant skill file in full.**

Skills contain the condensed patterns from all previous work. An agent that skips the skill and invents its own approach will break consistency, introduce RTL violations, skip caching, or miss architecture patterns.

### Which skill to read

| Task type | Read this first |
|-----------|----------------|
| Any performance work (slow page, query optimization, bundle size, loading states, Lighthouse) | `.claude/skills/optimization/SKILL.md` |
| Any code work (new feature, new component, new API route, refactor, new module) | `.claude/skills/code-quality/SKILL.md` |
| Any UI work (new page, form, list, layout decision, UX review) | `.claude/skills/ux-design/SKILL.md` |
| Any feature with user interactions (forms, buttons, navigation) | `.claude/skills/analytics/SKILL.md` |
| Code review (post-commit, post-feature) | `.claude/agents/code-reviewer.md` (agent, not skill) |
| After completing ANY task | `.claude/skills/context-update/SKILL.md` |

### How to read a skill

```bash
cat .claude/skills/optimization/SKILL.md
cat .claude/skills/code-quality/SKILL.md
cat .claude/skills/context-update/SKILL.md
cat .claude/skills/ux-design/SKILL.md
cat .claude/skills/analytics/SKILL.md
```

### When in doubt, read both

If your task involves both new code AND performance considerations (e.g., building a new finance page that must be fast), read both the code-quality skill and the optimization skill before starting.

**The context-update skill is mandatory at the end of every session without exception.**

---

## 15. Change Log

| Date | Agent Task | Key Changes | Files Modified |
|------|-----------|-------------|----------------|
| 2026-06-24 | Onboarding model decided + plan | Designed the church + member onboarding model with the CEO and wrote the canonical spec [ONBOARDING_PLAN.md](ONBOARDING_PLAN.md). **Decisions:** identity = phone/**WhatsApp OTP** (one phone = one person, deduped); **concierge** church onboarding (request→operator-approve); members via **two doors** (leader-add+OTP-claim, or self-signup+leader-approve) into one lifecycle (`managed→pending→active→inactive`); pre-added phone = pre-approval; approvers = super_admin + ministry_leader; per-church directory privacy. **Structural approach:** "claimable shadow identity" (leader-add creates a phone-only `auth.admin.createUser` user the person claims via OTP — avoids decoupling `profiles.id` from `auth.users`). Verified the 4 "backend-only" features are actually LIVE; updated LAUNCH_CHECKLIST (e2e done, backend-only gating dropped, WhatsApp/Meta dependency added). Build is phased + agent-assigned. Not built yet. | ONBOARDING_PLAN.md (NEW), LAUNCH_CHECKLIST.md, CLAUDE.md |
| 2026-06-23 | Full persona journey testing (PM/E2E) | Walked every user journey for 5 personas (member, group_leader, ministry_leader, super_admin, cross-church admin). **Phase A** (`e2e/persona-matrix.spec.ts`): all 4 roles × every route, render-vs-blocked + deep-link probes. **Found + fixed 2 access-control gaps** — `/admin/settings/roles` and `/admin/permissions/[userId]` were `'use client'` pages with no guard (any signed-in user could load the shell; verified no data leaked — APIs are super_admin-locked). Fixed via server wrappers calling `requireRole('super_admin')`. **Phase B** (`member-actions.spec.ts`, `leader-admin-crosschurch.spec.ts`): member RSVP/serve/pray/"I'm praying", leader gathering+attendance, admin announcement — all pass. **Phase C**: cross-church need post→respond→409-dedup. All API-driven + self-cleaning. 0 TS errors. | app/(app)/admin/settings/roles/{page.tsx,RoleDefaultsClient.tsx}, app/(app)/admin/permissions/[userId]/{page.tsx,UserPermissionClient.tsx}, e2e/{persona-matrix,member-actions,leader-admin-crosschurch}.spec.ts, e2e/README.md, .env.e2e.example, CLAUDE.md |
| 2026-06-23 | Mobile sweep + e2e tests | (1) **Mobile bug fixes** — FAB stack overlapped content (AppShell bottom padding), visitor "visited X ago" rendered Arabic in EN UI, 6 missing `notificationsPage.types.*` labels (144 console errors), small touch targets enlarged (songs present icon 32→44px, ministry member-row select/links, bible toolbar). (2) **Playwright e2e suite** for launch-critical paths — permission enforcement, finance-off (pages redirect + API 404), onboarding gate, public visitor intake; 24 tests (chromium+mobile) green vs seeded DB; env-gated, serial by default. (3) **Real bug caught + fixed** — `CreateVisitorSchema` rejected `""` on optional fields but the public /join form submits every enabled field, so blank email/age/how-heard → "Validation failed" (visitor couldn't submit). Fixed via `""`→undefined coercion + vitest regression test. 974 unit + 24 e2e pass, 0 TS errors. | components/layout/AppShell.tsx, components/visitors/{VisitorQueue,LeaderVisitorList}.tsx, components/songs/SongsTable.tsx, components/ministries/MinistryMemberManager.tsx, components/bible/BibleReader.tsx, messages/{en,ar,ar-eg}.json, lib/schemas/visitor.ts (+test), e2e/* (NEW specs), playwright.config.ts, .env.e2e.example (NEW), .gitignore, CLAUDE.md |
| 2026-06-22 | Finance-off + onboarding fixes | (1) **Finance flagged OFF** — `finance` flag (default off), enforced in middleware (pages redirect, /api/finance/* → 404) + nav hidden. (2) **CRITICAL onboarding bugs fixed** — fresh-church + leader registration left admins/leaders stuck as `member` (user_churches.role not synced with profiles.role; apiHandler trusts user_churches). Fixed via register-route upsert, migration 075 (backfill), and migration 076 (sync trigger + full backfill). (3) **Migration 074** repairs schema drift (funds/budgets.currency, song-publish column, 5 duplicate FKs). (4) **Schema verification gate** — `scripts/verify-prod-schema.mjs` + `npm run verify:schema` (10 checks) + REBUILD_AND_VERIFY.md runbook. (5) Onboarding edge cases verified (self-signup member role/access; fresh-church + leader e2e). 973 tests, 0 TS errors. | lib/features.ts, middleware.ts, lib/navigation.ts (+test), app/api/churches/register/route.ts (+test), supabase/migrations/074-076 (NEW), scripts/verify-prod-schema.mjs (NEW), supabase/REBUILD_AND_VERIFY.md (NEW), package.json, CLAUDE.md |
| 2026-06-22 | Pre-launch hardening | Working the launch checklist: (1) **SECURITY** — fixed songs cross-church write IDOR via migration 073 (UPDATE policy had no church scope); (2) distributed rate limiting (Upstash Redis + in-memory fallback) in lib/api/rate-limit.ts, handler awaits async path; (3) i18n parity — 332 Egyptian-Arabic translations added, fixed duplicate-key bug (shadowed locations/bookings blocks) in en/ar, all 3 files now 2,558 keys; (4) eliminated select('*') in songs routes/pages; (5) browser-safe logger + converted 24 console.* call sites; (6) declared vitest devDep (was undeclared — npm install pruned it), added test/typecheck scripts + GitHub Actions CI; (7) verified cron auth; (8) doc sync. Discovered the 4 "backend-only" features are actually live+wired. 972 tests, 0 TS errors. | supabase/migrations/073 (NEW), lib/api/rate-limit.ts, lib/api/handler.ts, lib/logger.ts, app/api/songs/**, app/(app)/admin/songs/[id], app/presenter/songs/[id], 14 error.tsx, lib/hooks/usePushNotifications.ts, 3 client pages, messages/{en,ar,ar-eg}.json, package.json, .github/workflows/ci.yml, .env.example, ~9 test files, LAUNCH_CHECKLIST.md + OPERATIONS_RUNBOOK.md (NEW), CLAUDE.md |
| 2026-03-14 | UX full fixes (Phase 2) | 207 remaining issues: pb-24 on ~76 pages, finance responsive layout (13 pages), 6 AlertDialog confirmations, mobile overflow fixes (6 locations + visitor mobile cards), 8 empty states with icons/CTAs, dir="auto" on ~20 inputs, text-base iOS zoom, aria-label on ~15 buttons, text-[9px]→text-xs in 23 files, Help FAB icon, landing mobile menu, tabs dir fix, role badge translated, SongForm steps translated, MySignups deleted, dev buttons hidden. ~90 translation keys. | 151 files: ~76 page.tsx (pb-24), 13 finance pages (responsive), 6 components (dialogs), 11 components (overflow/cards), 22 components (a11y/dir-auto), 23 files (text sizes), 3 translation files |
| 2026-03-15 | Production readiness hardening | Test credentials removed from prod bundle (NODE_ENV guard on login arrays), security headers added to next.config.ts (5 headers on all routes), /api/health endpoint for monitoring, .env.example updated with Sentry vars. 948 tests, 0 TS errors. | app/(auth)/login/page.tsx, next.config.ts, app/api/health/route.ts (NEW), .env.example |
| 2026-03-15 | Production readiness audit | 60+ fixes in 4 parallel waves: 7 new migrations (049-055), RLS hardening (self-escalation trigger, scoped policies, CASCADE→RESTRICT), atomic RPCs (serving signup, transaction update), unique constraints (event_registrations, bible_bookmarks), upsert patterns, PII stripping on cross-church needs, sanitizeLikePattern on 5 search routes, finance FK validation (donations + expenses), double-submit guards on 8 forms, dashboard caching (unstable_cache 300s), conditional Sentry/Firebase imports, batched cron processing, error boundaries, 21 RTL icon fixes, bilingual global-error, BudgetForm i18n, onboarding error.message leak fix. 948 tests, 0 TS errors. | supabase/migrations/049-055, ~30 app/api/**/route.ts, 6 finance form files, lib/dashboard/queries.ts, lib/api/rate-limit.ts, lib/api/handler.ts, middleware.ts, app/global-error.tsx, app/onboarding/page.tsx, 15+ component files, messages/*.json |
| 2026-03-14 | UX critical fixes (Phase 1) | 51 critical issues: dir="ltr" on ~40 currency amounts, rtl:rotate-180 on all directional icons, ~50 hardcoded strings → t(), touch targets enlarged (24-32px → 36-44px), confirm()→AlertDialog, paddingInlineStart, locale-aware fmt(), 2 pages fully translated. 120+ translation keys. | 52 files: 12 finance pages, 7 bible/songs, 7 auth/dashboard/permissions, 12 events/members/ministries, 6 prayer/notifications/visitors, 3 translation files |
| 2026-03-14 | Week 5 polish | P1: 62 console calls → structured logger across 34 files. P2: churches/search migrated to apiHandler with profileOptional (all routes on apiHandler). P3: ~100 more any types replaced across 25 files. Only 11 intentional any remaining. 952 tests, 0 TS errors. | 34 app/api/**/route.ts, lib/api/handler.ts, lib/api/cron-auth.ts, 18 app/**/page.tsx, 4 components/**/*.tsx, 4 lib/dashboard/*.ts, 1 test file |
| 2026-03-14 | Week 4 code quality | P1: 36 routes bounded with .limit() — zero unbounded list queries remain. P2: 25 routes narrowed from select('*') to specific columns — zero select('*') in API routes. P3: 33 mutation routes added revalidateTag for cache invalidation. P4: ~80 any types replaced with proper types across 26 files (dashboard queries, auth, scope, features, messaging providers, Bible, events, serving components). 952 tests, 0 TS errors. | 54 app/api/**/route.ts, 14 components/**/*.tsx, 8 lib/**/*.ts, 1 test file |
| 2026-03-14 | Week 3 hardening | P1: Zod validation on 18 mutation routes (4 new schemas: bible, church, push, notification-send). P2: 27 missing loading.tsx skeleton files. P3: 3 sequential await → Promise.all. P4: 14 select('*') narrowed. Code reviewer agent (32 checks, auto-trigger hook). 952 tests, 0 TS errors. | lib/schemas/{bible,church,push,notification-send}.ts, 18 app/api/**/route.ts, 27 loading.tsx files, 16 page.tsx files, .claude/agents/code-reviewer.md |
| 2026-03-13 | API standardization (Week 2) | Migrated 63 routes to apiHandler in 2 batches. Batch 1: events (10), serving (4), templates (4), church-prayers (4), outreach (3), visitors (2), profiles (6), push (3), bible (11). Batch 2: ministries (5), announcements [id] (3), church settings (2), churches join/switch/my-churches (3), leader routes (2), misc (5). Added Zod schemas: ministry.ts, template.ts, outreach.ts + extended event.ts, prayer.ts, visitor.ts. Fixed missing church_id filters on 8 routes. 109/116 routes on apiHandler (94%). 952 tests passing. | 82 route files, lib/schemas/ministry.ts, lib/schemas/template.ts, lib/schemas/outreach.ts, smoke test files |
| 2026-03-13 | Security hardening (Week 1) | Rate limiting added to apiHandler (strict/normal/relaxed tiers via lib/api/rate-limit.ts). 2 IDOR vulnerabilities fixed: bible bookmarks/highlights [id] routes migrated from manual auth to apiHandler with church_id + profile_id filters. dev-login endpoint deleted. RTL violation fixed (ps-9, start-3 in onboarding). 33 TypeScript errors in test files fixed (mock type casts, missing vitest imports). Smoke tests updated to reflect route migrations. 0 tsc errors, 0 RTL violations, 913/913 tests passing. | lib/api/handler.ts, lib/api/rate-limit.ts, app/api/bible/bookmarks/[id]/route.ts, app/api/bible/highlights/[id]/route.ts, app/api/auth/dev-login/ (deleted), app/onboarding/page.tsx, 16 test files, lib/api/__tests__/smoke-manual-auth.test.ts, lib/api/__tests__/smoke-id-routes.test.ts |
| 2026-03-13 | Comprehensive test expansion | 913 tests (56 files) — from 455 tests (22 files). P0: auth, rate-limit, absence, middleware. P1: features, audit, config, scope, navigation, messaging (templates, audience, scopes, dispatcher, providers, triggers), church registration flow. P2: smoke tests (manual auth 54 entries, public routes 6 entries, apiHandler 35+38 entries), API route behavioral tests (finance, serving, events, profiles, notifications, visitors, community needs, announcements, bible, templates, church-prayers), dashboard queries, utilities | lib/__tests__/*.test.ts (7 files), lib/api/__tests__/*.test.ts (5 files), lib/messaging/__tests__/*.test.ts (6 files), app/api/**/__tests__/*.test.ts (13 files), lib/utils/__tests__/*.test.ts (2 files), lib/analytics/__tests__/events.test.ts, lib/dashboard/__tests__/queries.test.ts, __tests__/middleware.test.ts |
| 2026-03-12 | PostHog analytics | Full PostHog instrumentation: events catalog (50+ events), provider, user identification, error boundary tracking, analytics skill, audit script | lib/analytics/**, components/shared/PostHogProvider.tsx, .claude/skills/analytics/SKILL.md, .claude/scripts/analytics-audit.sh |
| 2026-03-12 | Feature seeding agent | Seeding agent for realistic test data + edge cases per feature, runner script, supabase/seeds/ directory | .claude/agents/seed-feature.md, .claude/scripts/seed-feature.sh |
| 2026-03-12 | UX designer agent system | UX design skill (design system, component patterns, review checklist), agent prompt (Mode A review + Mode B spec), runner script | .claude/skills/ux-design/SKILL.md, .claude/agents/ux-designer.md, .claude/scripts/ux-review.sh |
| 2026-03-12 | Church Needs messaging + notifications | Inter-church messaging threads, 3 notification triggers, "Your Needs" tab, 2 more test churches, /simplify optimization | supabase/migrations/042-043, app/api/community/**/messages/**, components/community/MessageThread.tsx, lib/messaging/triggers.ts, lib/messaging/templates.ts, lib/messaging/types.ts |
| 2026-03-12 | Church Needs marketplace | Cross-church needs/responses feature: 2 permissions, 4 API routes, 5 components, 3 pages, seed data with 3 churches | supabase/migrations/035-036, app/api/community/**, app/(app)/community/**, components/community/**, lib/permissions.ts, lib/navigation.ts, types/index.ts |
| 2026-03-12 | Auto-optimization agent system | Hooks, agent prompt, trigger scripts | .claude/agents/, .claude/scripts/, .claude/settings.json |
| 2026-03-12 | Initial CLAUDE.md creation | Created project context system + 3 skills | CLAUDE.md, .claude/skills/** |
| 2026-03-11 | Optimizations and finance | Finance module optimization, performance indexes | app/(app)/admin/finance/**, supabase/migrations/034 |
| 2026-03-11 | MoreSheet padding fix | Bottom nav height CSS variable for Sign Out visibility | components/layout/MoreSheet.tsx |
| 2026-03-11 | Multi-church join flow fix | Fix TS never type error in user_churches insert | app/api/churches/ |
| 2026-03-11 | Multi-church membership | user_churches table, church switcher, join flow | supabase/migrations/031, components/layout/ChurchSwitcher.tsx |
| 2026-03-11 | Mobile UX audit | Responsive layouts, RTL logical properties, mobile card fallbacks | app/**, components/** |
| 2026-03-09 | Push notifications | Firebase FCM integration, push tokens | supabase/migrations/032, lib/firebase/ |
| 2026-03-09 | Next.js upgrade | Upgraded to 15.3.x for Vercel CVE fix | package.json |
| 2026-03-04 | RBAC permissions | Permission system, prayer assignment, notifications | supabase/migrations/024-026, lib/permissions.ts |
| 2026-02-20 | Phase 5-7 | Bible, serving, announcements, notifications, songs, dashboards | app/**, components/**, supabase/migrations/006-014 |
| 2026-02-17 | Phase 2-3 | Visitors, groups, gatherings, attendance, prayer | app/**, supabase/migrations/004-005 |
