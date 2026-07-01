# Journey: Ministry Leader

> Ground truth for every claim in this doc is cited inline. Sources: `lib/permissions.ts`,
> `lib/navigation.ts`, `lib/auth.ts`, route guards under `app/`, `CLAUDE.md` §3, `ONBOARDING_PLAN.md`.
> Derived strictly from code — no invented behavior.

---

## 1. Who they are

The `ministry_leader` has **admin-level access for ministry operations** — events, templates,
serving, visitors, and finance approval (when enabled) — but **cannot manage permissions or church
settings** (`CLAUDE.md` §3, roles table).

Unlike super_admin, a ministry_leader gets **exactly** the flags set in
`HARDCODED_ROLE_DEFAULTS.ministry_leader` (`lib/permissions.ts` L116–131), then layered with
church-level role defaults and additive per-user overrides (`resolvePermissions`, L159–190). There
is no "grant everything" shortcut.

**Default permission map** (`lib/permissions.ts` L116–131):

| Permission | Default | Permission | Default |
|---|---|---|---|
| `can_view_visitors` | ✅ | `can_manage_visitors` | ✅ |
| `can_manage_events` | ✅ | `can_manage_templates` | ✅ |
| `can_manage_serving` | ✅ | `can_view_reports` | ✅ |
| `can_approve_expenses` | ✅ | `can_submit_expenses` | ✅ |
| `can_manage_locations` | ✅ | `can_book_locations` | ✅ |
| `can_view_church_needs` | ✅ | `can_manage_church_needs` | ❌ |
| `can_view_members` | ❌ | `can_manage_members` | ❌ |
| `can_view_member_phone` | ❌ | `can_manage_announcements` | ❌ |
| `can_manage_songs` | ❌ | `can_view_prayers` | ❌ |
| `can_manage_outreach` | ❌ | `can_manage_liturgy` | ❌ |
| `can_view_finances` / `can_manage_finances` / `can_manage_donations` / `can_manage_budgets` / `can_manage_campaigns` / `can_reconcile_bank` | ❌ | `can_view_own_giving` | ✅ |

> These are **defaults**. A super_admin can raise any of the ❌ items via church-level role defaults
> or a per-user override (additive-only; `lib/permissions.ts` L172–187). Everything below describes
> the out-of-the-box ministry_leader.

---

## 2. What they CAN do

### Events, Templates, Calendar
- **Manage events** — `can_manage_events` ✅. Create: `app/(app)/admin/events/new/page.tsx` L10.
  API: `app/api/events/route.ts` L118, `[id]/route.ts` L63/L78, `service-needs/route.ts` L163,
  `service-requests/route.ts` L108, `from-template/route.ts` L93.
- **Manage templates** — `can_manage_templates` ✅. `app/(app)/admin/templates/new/page.tsx` L6;
  API `app/api/templates/route.ts` L94, `[id]/needs` L40, `[id]/segments` L62.
- **Calendar** — nav `['ministry_leader','super_admin']` + `can_manage_events`
  (`lib/navigation.ts` L118–126); API `['ministry_leader','super_admin']`
  (`app/api/calendar/route.ts` L111).

### Serving
- **Manage serving areas + slots** — `can_manage_serving` ✅. `app/api/serving/areas/route.ts` L40,
  `slots/route.ts` L79, `slots/[id]/route.ts` L69/L88, `areas/[id]/route.ts` L47/L66.

### Visitors
- **View + manage visitors** — `can_view_visitors` ✅, `can_manage_visitors` ✅.
  Queue page: `requirePermission('can_view_visitors')` (`app/(app)/admin/visitors/page.tsx` L10).
  Visitor CRUD API: `['super_admin','ministry_leader','group_leader']`
  (`app/api/visitors/route.ts` L115, `[id]/route.ts` L145).

### Ministries
- **View + manage ministries** — nav `['ministry_leader','super_admin']` (`lib/navigation.ts` L58–65);
  page `requireRole('ministry_leader','super_admin')` (`app/(app)/admin/ministries/page.tsx` L10).
  Ministry CRUD, members, meetings, action items, notify: all `['ministry_leader','super_admin']`
  (`app/api/ministries/**`). **Exception:** deleting a ministry is super_admin-only
  (`app/api/ministries/[id]/route.ts` L76).

### Members — add (but not mint leaders)
- **Add a member** — `POST /api/members` requires `['super_admin','ministry_leader']`
  (`app/api/members/route.ts` L171). A ministry_leader may add a person with the **`member`** role
  only. Seeding a leader role is blocked:
  ```ts
  // app/api/members/route.ts L30
  if (role !== 'member' && profile.role !== 'super_admin') { return 403 }
  ```
- **Approve / decline member join requests** — Join Requests queue: nav
  `['ministry_leader','super_admin']` (`lib/navigation.ts` L98–105); page guard
  `requireRole('ministry_leader','super_admin')` (`app/(app)/admin/join-requests/page.tsx` L9);
  API `GET/PATCH /api/churches/join-requests` `['ministry_leader','super_admin']`
  (`app/api/churches/join-requests/route.ts` L28, L68).
- **Register a leader directly** — `POST /api/leaders/register` allows
  `['ministry_leader','super_admin']` (`app/api/leaders/register/route.ts` L97). (Note the mismatch
  with `/api/members`, which restricts leader creation to super_admin — this dedicated leader route
  is role-gated at the handler level, not by the member-seed check.)

### Reports, Church Needs, Locations, QR
- **View reports** — `can_view_reports` ✅ (`lib/permissions.ts` L122). Nav Reports item carries
  `feature: 'finance'` (`lib/navigation.ts` L258–267) — hidden while finance is off.
- **View church needs** — `can_view_church_needs` ✅. Browse/respond:
  `app/(app)/community/needs/page.tsx` L70. (Cannot **post** a need — see §3.)
- **Manage + book locations** — `can_manage_locations` ✅, `can_book_locations` ✅
  (`app/api/locations/route.ts` L36; `app/api/bookings/route.ts` L93;
  `app/(app)/admin/locations/page.tsx` L10).
- **QR code page** — nav `['ministry_leader','super_admin']`; page guard
  `requireRole('ministry_leader','super_admin')` (`app/(app)/admin/settings/qr/page.tsx` L19).

### Finance approvals (only if the `finance` flag is on)
- **Approve expenses** — `can_approve_expenses` ✅ (`app/api/finance/expenses/[id]/approve/route.ts`
  L47, `reject/route.ts` L33). **Submit expenses** — `can_submit_expenses` ✅
  (`app/api/finance/expenses/route.ts` L53). All finance routes are unreachable while the flag is
  off (`CLAUDE.md` header) — so in the current build these do not apply.

### Everyone-level basics
- Dashboard, profile, events browsing, serving signup, announcements (view), prayer, Bible,
  songs (view), liturgy, notifications — all `roles: ['member', … ,'ministry_leader','super_admin']`
  in nav (`lib/navigation.ts`).

---

## 3. What they CANNOT do

- **Cannot manage permissions.** Role defaults (`/admin/settings/roles`), per-user overrides
  (`/admin/permissions`) are `requireRole('super_admin')` — a ministry_leader is redirected to
  `/dashboard` (`lib/auth.ts` `requireRole` L192–198; pages
  `app/(app)/admin/settings/roles/page.tsx` L8, `app/(app)/admin/permissions/page.tsx` L30). Nav
  items are `['super_admin']` only (`lib/navigation.ts` L278–294).
- **Cannot change church settings.** Settings hub, Privacy, Notification-channel, Visitor-form
  config are all super_admin-only (`app/(app)/admin/settings/page.tsx` L8;
  `app/api/churches/privacy-settings/route.ts` L25/L45;
  `app/api/churches/notification-settings/route.ts` L25/L45;
  `app/api/churches/visitor-form-config/route.ts` L56).
- **Cannot add a member with a leader role via `/api/members`.** Only super_admin may seed a
  non-`member` role (`app/api/members/route.ts` L30).
- **Cannot view members list or member phone numbers by default.** `can_view_members`,
  `can_manage_members`, `can_view_member_phone` all default `false` (`lib/permissions.ts` L117–118).
  The Members nav item is permission-gated on `can_view_members` (`lib/navigation.ts` L74), so it is
  hidden unless a super_admin grants it.
- **Cannot manage announcements, songs, prayers, outreach, liturgy, or church needs** by default —
  those defaults are `false` (`lib/permissions.ts` L120–124, L145). E.g. posting a church need
  requires `can_manage_church_needs` (`app/(app)/community/needs/new/page.tsx` L5), which they lack.
- **Cannot manage groups.** The Groups admin nav item is `['super_admin']` only
  (`lib/navigation.ts` L48–56); group CRUD API requires `can_manage_members`
  (`app/api/groups/route.ts` L70), a `false` default.
- **Cannot delete a ministry** (super_admin-only; `app/api/ministries/[id]/route.ts` L76) or
  **publish a song to the global library** (`app/api/songs/[id]/publish/route.ts` L38).
- **Cannot approve or reject churches.** That is the **platform operator** (email allow-list
  `PLATFORM_ADMIN_EMAILS`, `lib/platform.ts`) — entirely outside church RBAC.
- **Cannot use finance** while the `finance` flag is off (true for everyone; `CLAUDE.md` header).
  Even with the flag on, `can_view_finances` / `can_manage_finances` default `false` — a
  ministry_leader gets **approval/submit** of expenses, not full finance, unless granted.

---

## 4. Key journeys

### A. Add a member
1. Open the Add Member dialog → `POST /api/members` with name + optional phone
   (`app/api/members/route.ts`). Leave the role as `member` — you cannot set a leader role (L30).
2. The route creates a claimable **shadow identity** (`user_churches.status = 'managed'`) or, if the
   phone already exists in **another** church, an **`invited`** membership (L76–99). No duplicate
   identity is created (dedupe by phone, L43–100).
3. The person claims it on first WhatsApp-OTP sign-in → `POST /api/members/claim` flips their own
   `managed` memberships to `active` (`app/api/members/claim/route.ts`).

### B. Run an event with service planning
1. Create the event → `app/(app)/admin/events/new` (`can_manage_events`).
2. Add run-of-show segments and service needs → `POST /api/events/[id]/segments` (L59) and
   `POST /api/events/[id]/service-needs` (L163) — both `can_manage_events`.
3. Optionally start from a template → `POST /api/events/from-template` (L93). Manage volunteer
   assignments and registrations via the event's routes (`app/api/events/[id]/registrations` L25/L53).

### C. Approve a member join request
1. Open the Join Requests queue → `/admin/join-requests`
   (`requireRole('ministry_leader','super_admin')`).
2. Approve or decline → `PATCH /api/churches/join-requests`
   (`['ministry_leader','super_admin']`, `app/api/churches/join-requests/route.ts` L68). Approving
   grants the membership.

---

## 5. Access & lifecycle notes

- **How you get the role:** a super_admin adds/registers you as a leader — via
  `POST /api/leaders/register` (`['ministry_leader','super_admin']`) or by setting a leader role in
  `POST /api/members` (super_admin only). Promotion sets the authoritative `user_churches.role`.
- **Authoritative role source:** `user_churches.role`, cross-referenced every request
  (`lib/auth.ts` L46–63) — a stale `profiles.role` cannot escalate you.
- **Membership status gate:** access requires `user_churches.status` to be **active**; `managed` /
  `invited` / `inactive` memberships are redirected to `/login`
  (`lib/auth.ts` L59–61, `isActiveMembership`).
- **Multi-church:** you may be a ministry_leader in one church and a member in another; the
  effective role + permissions are recomputed per church on switch (`lib/auth.ts`).

---

## 6. Edge cases / gotchas

- **Two different rules for creating leaders.** `/api/members` blocks a ministry_leader from
  seeding any non-`member` role (`app/api/members/route.ts` L30), but the dedicated
  `/api/leaders/register` route allows `['ministry_leader','super_admin']`
  (`app/api/leaders/register/route.ts` L97). If leader-minting must be super_admin-only, the
  leaders/register guard is the surface to tighten.
- **Cross-church member add creates an INVITE.** Adding a phone that belongs to a person in another
  church inserts an inert `invited` membership; they must accept before it becomes active
  (`app/api/members/route.ts` L76–99; `ONBOARDING_PLAN.md` FIX 3).
- **Member list + phone are hidden by default.** `can_view_members` and `can_view_member_phone`
  default `false`; the church-wide phone default `leaders_only` means ministry_leader/super_admin,
  but only *if* the member-view permission is also granted. A super_admin must grant `can_view_members`
  for the Members nav/page to appear (`lib/navigation.ts` L74; migration 081 in `CLAUDE.md`).
- **Finance approval ≠ finance access.** Defaults give `can_approve_expenses` / `can_submit_expenses`
  but NOT `can_view_finances` / `can_manage_finances`. And the whole module is behind the `finance`
  flag, off by default (`CLAUDE.md` header).
- **Reports item is finance-gated.** Even with `can_view_reports`, the Reports nav entry carries
  `feature: 'finance'` and is hidden while finance is off (`lib/navigation.ts` L258–267).
