# Journey: Super Admin

> Ground truth for every claim in this doc is cited inline. Sources: `lib/permissions.ts`,
> `lib/navigation.ts`, `lib/auth.ts`, `lib/platform.ts`, route guards under `app/`, `CLAUDE.md` §3,
> `ONBOARDING_PLAN.md`. This is derived strictly from code — no invented behavior.

---

## 1. Who they are

The `super_admin` is the church's owner/operator — **full access to everything within their
church**: all admin pages, permissions, church settings, and finance (when enabled).
(`CLAUDE.md` §3, roles table.)

In code this is not a bundle of flags — it is a hard shortcut. `resolvePermissions()` returns the
complete permission set immediately when `role === 'super_admin'`, before any church-level or
user-level layering runs:

```ts
// lib/permissions.ts
if (role === 'super_admin') {
  return { ...HARDCODED_ROLE_DEFAULTS.super_admin }   // every key = true
}
```

Every key in `HARDCODED_ROLE_DEFAULTS.super_admin` is `true` (`lib/permissions.ts` L132–147).
So **any `requirePermission(...)` guard in the app passes for a super_admin.**

**Important scoping note:** super_admin is a **per-church** role. It is NOT the platform
operator. Approving/rejecting brand-new churches sits *outside* the church RBAC system and is
gated only by email allow-list (`lib/platform.ts`, `isPlatformAdmin`). See §3.

---

## 2. What they CAN do

Every capability below is unlocked because the super_admin shortcut grants the permission the
guard checks. Guards are `requireRole(...)` / `requirePermission(...)` in pages (`lib/auth.ts`)
and `requireRoles` / `requirePermissions` in API routes (via `apiHandler`).

### People & Members
- **View + manage members** — `can_view_members`, `can_manage_members` (`lib/permissions.ts` L133).
  - Members list page: `requirePermission('can_view_members')` (`app/(app)/admin/members/page.tsx` L28).
  - Member API: `POST/GET /api/profiles` requires `['ministry_leader','super_admin']` (`app/api/profiles/route.ts` L66).
  - At-risk report: `requirePermissions: ['can_view_members']` (`app/api/profiles/at-risk/route.ts` L25).
- **View member phone numbers** — `can_view_member_phone` = true (`lib/permissions.ts` L134). super_admin
  always sees phones regardless of the church's `member_directory_visibility` setting (see `CLAUDE.md`
  change log, migration 081; `lib/members/visibility.ts`).
- **Add a member — including a member with a leader role** — `POST /api/members`
  requires `['super_admin','ministry_leader']`, but the route explicitly reserves seeding a
  **non-`member`** (leader) role to super_admin only:
  ```ts
  // app/api/members/route.ts L30
  if (role !== 'member' && profile.role !== 'super_admin') { return 403 }
  ```
- **Register a leader directly** — `POST /api/leaders/register` requires
  `['ministry_leader','super_admin']` (`app/api/leaders/register/route.ts` L97).
- **Approve/decline member join requests** — Join Requests queue nav item is
  `['ministry_leader','super_admin']` (`lib/navigation.ts` L98–105); page guard
  `requireRole('ministry_leader','super_admin')` (`app/(app)/admin/join-requests/page.tsx` L9);
  API `GET/PATCH /api/churches/join-requests` requires `['ministry_leader','super_admin']`
  (`app/api/churches/join-requests/route.ts` L28, L68).

### Groups & Ministries
- **Manage groups** — nav "Groups" is `['super_admin']` only (`lib/navigation.ts` L48–56); page
  guard `requireRole('group_leader','super_admin')` (`app/(app)/admin/groups/page.tsx` L11).
  Group CRUD API gated by `can_manage_members` (`app/api/groups/route.ts` L70,
  `app/api/groups/[id]/members/route.ts` L53, L76).
- **Manage ministries** — nav `['ministry_leader','super_admin']` (`lib/navigation.ts` L58–65),
  page guard `requireRole('ministry_leader','super_admin')` (`app/(app)/admin/ministries/page.tsx` L10).
  Ministry CRUD requires `['ministry_leader','super_admin']`; **deleting a ministry** is
  super_admin-only (`app/api/ministries/[id]/route.ts` L76).

### Events, Templates, Serving, Calendar
- **Manage events** — `can_manage_events` (`app/(app)/admin/events/new/page.tsx` L10;
  `app/api/events/route.ts` L118; service-needs L163; `app/api/calendar/route.ts` L111).
- **Manage templates** — `can_manage_templates` (`app/(app)/admin/templates/new/page.tsx` L6;
  `app/api/templates/route.ts` L94).
- **Manage serving** — `can_manage_serving` (`app/api/serving/areas/route.ts` L40;
  `app/api/serving/slots/route.ts` L79).
- **Calendar** — nav `['ministry_leader','super_admin']` + `can_manage_events` (`lib/navigation.ts` L118–126).

### Visitors & Outreach
- **View + manage visitors** — `can_view_visitors` (page `app/(app)/admin/visitors/page.tsx` L10);
  visitor CRUD requires `['super_admin','ministry_leader','group_leader']` (`app/api/visitors/route.ts` L115).
- **Manage outreach** — `can_manage_outreach` (`app/(app)/admin/outreach/page.tsx` L9;
  `app/api/outreach/route.ts` L135).

### Content: Announcements, Songs, Prayers, Liturgy, Locations
- **Manage announcements** — `can_manage_announcements` (true for super_admin only among
  defaults; `lib/permissions.ts` L137). API: `app/api/announcements/route.ts` L59.
- **Manage songs** — `can_manage_songs` (`app/api/songs/route.ts` L88); **publish a song to the
  global library** is super_admin-only (`app/api/songs/[id]/publish/route.ts` L38).
- **Prayer management** — `can_view_prayers` (`app/(app)/admin/prayers/page.tsx` L7).
- **Manage liturgy** — `can_manage_liturgy` (super_admin-only default; `lib/permissions.ts` L145);
  liturgy settings + readings sync are `['super_admin']` (`app/api/liturgy/settings/route.ts` L57,
  `app/api/liturgy/readings/sync/route.ts` L223).
- **Manage + book locations** — `can_manage_locations`, `can_book_locations`
  (`app/(app)/admin/locations/page.tsx` L10; `app/api/locations/route.ts` L36).

### Church Needs (cross-church marketplace)
- **View + manage church needs** — `can_view_church_needs`, `can_manage_church_needs`
  (super_admin has both; `lib/permissions.ts` L140). Posting a need:
  `requirePermission('can_manage_church_needs')` (`app/(app)/community/needs/new/page.tsx` L5).

### Church administration (super_admin-EXCLUSIVE)
These are gated by `requireRole('super_admin')` — a ministry_leader is redirected out.
- **Settings hub** — `requireRole('super_admin')` (`app/(app)/admin/settings/page.tsx` L8).
  Cards: QR code, Notifications, Privacy, Role Permissions.
- **Role permission defaults** — `/admin/settings/roles`, nav `['super_admin']`
  (`lib/navigation.ts` L278–285); page `requireRole('super_admin')`
  (`app/(app)/admin/settings/roles/page.tsx` L8); API `GET/PUT /api/permissions/role-defaults`
  requires `['super_admin']` (`app/api/permissions/role-defaults/route.ts` L30, L72).
- **Per-user permission overrides** — `/admin/permissions`, nav `['super_admin']`
  (`lib/navigation.ts` L287–294); pages `requireRole('super_admin')`
  (`app/(app)/admin/permissions/page.tsx` L30, `app/(app)/admin/permissions/[userId]/page.tsx` L8);
  API `app/api/permissions/user/[id]/route.ts` L88, L168; audit log L21.
- **Privacy (member phone visibility)** — `/admin/settings/privacy`, `requireRole('super_admin')`
  (`app/(app)/admin/settings/privacy/page.tsx` L10); API `GET/PUT /api/churches/privacy-settings`
  requires `['super_admin']` (`app/api/churches/privacy-settings/route.ts` L25, L45).
- **Notification channel (paid WhatsApp opt-in)** — `/admin/settings/notifications`,
  `requireRole('super_admin')` (`app/(app)/admin/settings/notifications/page.tsx` L9); API
  `['super_admin']` (`app/api/churches/notification-settings/route.ts` L25, L45).
- **Visitor intake form config** — `PUT /api/churches/visitor-form-config` requires `['super_admin']`
  (`app/api/churches/visitor-form-config/route.ts` L56).
- **Church settings (finance-linked)** — `POST /api/church/settings` requires `can_manage_finances`
  (`app/api/church/settings/route.ts` L36) — super_admin has it.

### Finance (only when the `finance` feature flag is on)
super_admin has **all** finance permissions (`can_view_finances`, `can_manage_finances`,
`can_manage_donations`, `can_manage_budgets`, `can_approve_expenses`, `can_submit_expenses`,
`can_manage_campaigns`, `can_reconcile_bank`; `lib/permissions.ts` L141–144). But finance nav
items carry `feature: 'finance'` (`lib/navigation.ts` L264, L313, L324) and **finance is OFF by
default** — middleware redirects the pages and 404s `/api/finance/*` (`CLAUDE.md` header warning).
So in the current build, even a super_admin cannot reach finance until the flag is enabled.

---

## 3. What they CANNOT do

- **Cannot approve or reject brand-new churches.** That is the **platform operator**, identified
  purely by the `PLATFORM_ADMIN_EMAILS` env allow-list (`lib/platform.ts`), completely outside the
  church RBAC system. A super_admin has zero platform authority unless their email is on that list.
- **Cannot use finance while the flag is off.** The permissions are all `true`, but the routes are
  unreachable (middleware redirect + 404) until `finance` is enabled (`CLAUDE.md` header).
- **Cannot act on another church's data.** All queries filter by the authenticated user's
  `church_id` (`CLAUDE.md` §13 non-negotiable #12). super_admin is per-church; it does not confer
  any cross-church admin power (the one cross-church surface, Church Needs, is a marketplace, not
  admin access).
- **Cannot silently pull an existing person from another church into their own.** A cross-church
  member-add creates an **`invited`** membership that is inert until the person accepts — see §6.
- **Cannot force a leader override to *remove* a permission.** The permission model is additive:
  user overrides can only set `true`, never `false` (`lib/permissions.ts` L180–187). (super_admin
  itself is unaffected — it always has everything.)

---

## 4. Key journeys

### A. Set up a fresh church (after platform approval)
1. Register the church via the registration wizard → `POST /api/churches/register` creates the
   church with **`status: 'pending'`** and `is_active` false — hidden from member search/join
   (`app/api/churches/register/route.ts` L66, L87).
2. The creator is promoted to `super_admin` on **both** `profiles.role` and the authoritative
   `user_churches.role` (route upserts both; `app/api/churches/register/route.ts` L162, L190). This
   is what prevents the historical "creator stuck as member" bug (`CLAUDE.md`, migration 075/076).
3. A **platform operator** (email in `PLATFORM_ADMIN_EMAILS`) approves the church at
   `/platform/churches` → status flips to `active` (`lib/platform.ts`; `ONBOARDING_PLAN.md`, A4).
   Until then the church sits on the "under review" gate.
4. Once active, configure the church: Settings hub (`/admin/settings`) → QR code, Notifications,
   Privacy, Role Permissions.

### B. Add / import members (leader-add + OTP claim)
1. Open the Add Member dialog (Members page) → `POST /api/members` with name + optional phone
   (`app/api/members/route.ts`). As super_admin you may set a leader role here; a ministry_leader
   cannot (L30).
2. The route creates a **claimable shadow identity**: a phone-only auth user with
   `user_churches.status = 'managed'` (L108–116, L155–160). No duplicate is created if the phone
   already exists — it dedupes by phone (L43–100).
3. The person later signs in via WhatsApp OTP; `POST /api/members/claim` flips **their own**
   `managed` memberships → `active` and stamps `phone_verified_at`
   (`app/api/members/claim/route.ts` L24–52). Pre-added phone = pre-approval, no queue.

### C. Grant a group leader phone visibility
1. Church-wide default for member phone visibility is `leaders_only` (`CLAUDE.md`, migration 081).
   Under that default, a `group_leader` does **not** see member phones (their
   `can_view_member_phone` default is `false`; `lib/permissions.ts` L102).
2. To grant it broadly, set the church's directory visibility to `everyone` at
   `/admin/settings/privacy` (`app/api/churches/privacy-settings/route.ts`).
3. To grant it to a specific person, add a **per-user override** at `/admin/permissions/[userId]`
   (`app/api/permissions/user/[id]/route.ts`) — overrides are additive-`true` only
   (`lib/permissions.ts` L180–187).

### D. Configure privacy & notifications
1. `/admin/settings/privacy` — choose who sees member phones: `everyone` / `leaders_only` /
   `hidden` (`app/api/churches/privacy-settings/route.ts`, Zod enum).
2. `/admin/settings/notifications` — toggle the **paid** WhatsApp notification channel on/off
   (default off; in-app + push are always free/on) (`app/api/churches/notification-settings/route.ts`).

### E. Manage permissions
1. **Role defaults** (`/admin/settings/roles`) — set church-level defaults per role. These layer on
   top of the hardcoded defaults for `member` / `group_leader` / `ministry_leader`
   (`resolvePermissions`, `lib/permissions.ts` L172–178). super_admin defaults are immutable (the
   shortcut).
2. **Per-user overrides** (`/admin/permissions/[userId]`) — additively grant extra permissions to
   an individual (`lib/permissions.ts` L180–187).

---

## 5. Access & lifecycle notes

- **How you get the role:** (a) register a church — the creator is upserted to `super_admin` on
  `user_churches` and `profiles` (`app/api/churches/register/route.ts`); or (b) another super_admin
  promotes you.
- **Authoritative role source:** `user_churches.role` (per-church), cross-referenced on every
  request to defeat stale `profiles.role` after a church switch (`lib/auth.ts` L46–63).
- **Membership status gate:** access requires `user_churches.status` to be **active**. A
  `managed` / `invited` / `inactive` membership is redirected to `/login`
  (`lib/auth.ts` L59–61, `isActiveMembership`).
- **Multi-church:** a user can hold different roles in different churches; the effective role and
  permissions are recomputed per church on switch (`lib/auth.ts`; church switcher).

---

## 6. Edge cases / gotchas

- **Cross-church member add now creates an INVITE, not a silent pull.** If the phone you add
  already belongs to a person in another church, the route inserts `status: 'invited'` (inert, no
  access) and notifies them — it does **not** auto-activate. They must accept via
  `/api/churches/invitations` (`app/api/members/route.ts` L76–99; `ONBOARDING_PLAN.md` FIX 3).
- **Phone visibility default is admin-only-ish.** Default `member_directory_visibility` is
  `leaders_only`, and unknown values **fail closed** to `leaders_only`. Setting `everyone` is what
  lets group leaders see member phones on group/ministry pages (`CLAUDE.md`, migration 081).
- **Finance is off for everyone**, super_admin included, until the `finance` flag is enabled
  (`CLAUDE.md` header; `lib/features.ts`).
- **Deleting a ministry and publishing a song to the global library are super_admin-exclusive**
  even though managing them is shared with ministry_leader (`app/api/ministries/[id]/route.ts` L76;
  `app/api/songs/[id]/publish/route.ts` L38).
- **super_admin ≠ platform admin.** Being the top role in your church gives you no ability to
  approve other churches (`lib/platform.ts`).
