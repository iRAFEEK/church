# Journey: Group Leader (`group_leader`)

> Derived strictly from code. Ground truth: `lib/permissions.ts` (`HARDCODED_ROLE_DEFAULTS.group_leader`),
> `lib/navigation.ts`, route guards under `app/`, and `CLAUDE.md` §3.
> Capabilities below are the role's *defaults* — a `super_admin` can additively grant more
> (church-level defaults in `role_permission_defaults`, or per-user overrides via
> `/admin/permissions`). Overrides can only *add* `true`, never remove — see
> `resolvePermissions()` in `lib/permissions.ts`.

---

## 1. Who they are

A **group leader** shepherds one small group. They are a regular member with extra reach
*into their own group* — its meetings (gatherings), attendance, group prayer, and the
visitors assigned to them for follow-up. They are **not** an admin: they cannot manage
church-wide members, events, settings, or approvals.

Per `CLAUDE.md` §3: "Leads a small group. Can submit expenses, view reports."
The authoritative per-church role lives in `user_churches.role` (kept in sync with
`profiles.role` by the migration-076 trigger); `apiHandler` and `requireRole` read it.

---

## 2. What they CAN do

Each capability is tied to a permission flag (`lib/permissions.ts`) and/or a nav entry
(`lib/navigation.ts`) / route guard.

### My Group (their own group)
- **See "My Group"** — nav item `My Group` → `/my-group` is `roles: ['group_leader']`
  (`lib/navigation.ts:39-47`). Lists the groups they lead/co-lead plus open groups
  (`app/(app)/my-group/page.tsx` — queries `groups` where `leader_id` / `co_leader_id`
  = their profile).
- **Open their group detail** → `/groups/[id]` (`app/(app)/groups/[id]/page.tsx`).
  From here they run the group: members, gathering history, prayer list, join requests.
- **Record gatherings + take attendance** — the group detail page renders
  `GatheringHistory` (`components/gathering/GatheringHistory.tsx`) and attendance
  components; writes go through `app/api/gatherings/**` (gathering CRUD + attendance).
- **Group prayer** — `PrayerList` (`components/gathering/PrayerList.tsx`) on the group page.
- **Approve/decline group join requests** for their own group — `PendingJoinRequests`
  + `JoinRequestButton` on the group page; API `app/api/groups/[id]/join-requests/route.ts`.

### Assigned visitors (follow-up)
- **`can_view_visitors: true`** (`lib/permissions.ts:103`). Two surfaces:
  - **My Visitors** → `/visitors`, nav `roles: ['group_leader']` (`lib/navigation.ts:88-96`).
    `app/(app)/visitors/page.tsx` shows only visitors where `assigned_to = their profile.id`,
    excluding `converted`.
  - **Visitors Queue** → `/admin/visitors` is gated by `can_view_visitors`
    (`lib/navigation.ts:78-87`; page guard `requirePermission('can_view_visitors')` in
    `app/(app)/admin/visitors/page.tsx`) — so a group leader can *view* the queue.
- They **cannot** re-assign or edit the visitor pipeline — `can_manage_visitors: false`
  (`lib/permissions.ts:103`). But `POST /api/visitors` (the *manage* handler at
  `app/api/visitors/route.ts:115`) allows `group_leader`, so they can act on their
  assigned visitors' contact updates within that route's scope.

### Reports
- **`can_view_reports: true`** (`lib/permissions.ts:106`). Nav `Reports` →
  `/admin/finance/reports` requires `can_view_reports` **and** the `finance` feature flag
  (`lib/navigation.ts:257-267`). **Finance is OFF** (`CLAUDE.md` header), so the finance
  reports route is currently unreachable; the permission is real and will surface reports
  when finance is re-enabled.

### Finance actions (permission held; module currently OFF)
- **`can_submit_expenses: true`** (`lib/permissions.ts:112`) — submit expense requests.
- **`can_view_own_giving: true`** (`lib/permissions.ts:110`) — see their own giving.
- Both live under `/admin/finance/expenses` and `/finance/my-giving`, gated by the
  `finance` feature flag (`lib/navigation.ts`). **Finance is OFF**, so these are gated
  off today (middleware redirects/404s). The permissions are correct and take effect on
  re-enable.

### Locations
- **`can_book_locations: true`** (`lib/permissions.ts:114`). Nav `Room Booking` →
  `/bookings`, `roles: ['group_leader', 'ministry_leader', 'super_admin']` +
  `permission: 'can_book_locations'` (`lib/navigation.ts:137-146`). They can reserve rooms
  for their group but **cannot manage** the location catalog (`can_manage_locations: false`).

### Community
- **`can_view_church_needs: true`** (`lib/permissions.ts:108`). Nav `Church Needs` →
  `/community/needs` + `permission: 'can_view_church_needs'` (`lib/navigation.ts:214-224`).
  View the cross-church needs marketplace. They **cannot** post/manage needs —
  `can_manage_church_needs: false`; posting requires `requirePermission('can_manage_church_needs')`
  (`app/(app)/community/needs/new/page.tsx`).

### Everything a member has
- Dashboard, profile, events (RSVP), serving signup, Bible, announcements, prayer,
  liturgy, songs, notifications — all `roles` arrays in `lib/navigation.ts` include
  `group_leader`. See `member.md` for details.
- **Request to join other groups** — same open-group / join-request flow as members
  (`/my-group`, `JoinRequestButton`, `app/api/groups/[id]/join-requests/route.ts`).

---

## 3. What they CANNOT do

All are `false` in `HARDCODED_ROLE_DEFAULTS.group_leader` (`lib/permissions.ts:100-115`)
unless a `super_admin` grants an override.

- **Cannot see the member directory or manage members** — `can_view_members: false`,
  `can_manage_members: false`. The `Members` nav item needs `can_view_members`
  (`lib/navigation.ts:68-77`); `/admin/members` guards on `requirePermission('can_view_members')`.
- **Cannot see member phone numbers** — `can_view_member_phone: false` (`lib/permissions.ts:102`).
  Phone visibility is additionally church-scoped via `canViewMemberPhone()`
  (`lib/members/visibility.ts`), used on the group page itself
  (`app/(app)/groups/[id]/page.tsx`). Default `member_directory_visibility = 'leaders_only'`
  maps to ministry_leader + super_admin only, so by default a group leader does **not** see
  member phones on group/ministry pages.
- **Cannot manage church-wide events / templates / calendar** — `can_manage_events: false`,
  `can_manage_templates: false`. `/admin/calendar` guards `requirePermission('can_manage_events')`;
  `/admin/events/new` and `/admin/templates/new` guard `can_manage_events` /
  `can_manage_templates`.
- **Cannot manage serving areas/slots** — `can_manage_serving: false` (they can *sign up*
  to serve like any member, but not create the slots).
- **Cannot manage announcements, songs, outreach, liturgy** — all `false`.
- **Cannot view/manage church-wide prayer requests** — `can_view_prayers: false`;
  `/admin/prayers` guards `requirePermission('can_view_prayers')`. (Group prayer inside
  their own group is separate and allowed.)
- **Cannot manage anything financial** — `can_manage_finances`, `can_manage_donations`,
  `can_manage_budgets`, `can_approve_expenses`, `can_manage_campaigns`,
  `can_reconcile_bank` all `false`. (And finance is OFF regardless.)
- **Cannot approve church join requests** — the member-approval queue `Join Requests` →
  `/admin/join-requests` is `roles: ['ministry_leader', 'super_admin']`
  (`lib/navigation.ts:97-105`); page guards `requireRole('ministry_leader', 'super_admin')`.
- **Cannot add/"mint" members** — `POST /api/members` requires
  `requireRoles: ['super_admin', 'ministry_leader']` (`app/api/members/route.ts:171`).
  A group leader is not allowed to create shadow member identities.
- **Cannot touch church settings, role permissions, or per-user permissions** — all
  `super_admin`-only (`/admin/settings*`, `/admin/settings/roles`, `/admin/permissions`
  guard `requireRole('super_admin')`).

---

## 4. Key journeys

### A. Record a gathering + take attendance
1. Open **My Group** (`/my-group`) → tap your group → `/groups/[id]`.
2. In the gathering section, start a new gathering (topic, date) — persists via
   `app/api/gatherings/**`.
3. Open the attendance roster for that gathering; mark each member
   present / absent / excused / late (writes to `attendance`, scoped to your `church_id`).
4. Save. Attendance history now shows the recorded gathering
   (`components/gathering/GatheringHistory.tsx`).

### B. Follow up an assigned visitor
1. Open **My Visitors** (`/visitors`). You see only visitors where `assigned_to` = you,
   excluding already-converted ones (`app/(app)/visitors/page.tsx`).
2. Tap a visitor to view contact info and the SLA countdown
   (`church.visitor_sla_hours`, default 48).
3. Log the contact / add notes; the update flows through `app/api/visitors/route.ts`
   (the manage handler permits `group_leader`).
4. The visitor moves out of your "needs contact" state.

### C. Submit an expense *(when finance is re-enabled)*
1. Navigate to `/admin/finance/expenses` → **New expense**
   (guard: `requirePermission('can_submit_expenses')`).
2. Fill amount, fund, description; submit.
3. It enters the approval workflow — a `ministry_leader`/`super_admin`
   (`can_approve_expenses`) approves it. You cannot self-approve.
   > Today this is **blocked**: finance is OFF (`CLAUDE.md` header), so the route 404s /
   > redirects. Journey applies once `NEXT_PUBLIC_FEATURE_FINANCE=true`.

### D. Handle a group join request
1. A member taps "Request to join" on your group (open group). It creates a pending
   join request (`app/api/groups/[id]/join-requests/route.ts`).
2. On your group page (`/groups/[id]`), the `PendingJoinRequests` panel lists requesters.
3. **Approve** → the person becomes a `group_members` row for your group. **Decline** →
   the request is dismissed.

---

## 5. Access & lifecycle notes

- **How a group leader exists:** they are a person (auth user + `profiles` row) whose
  per-church role is `group_leader` in `user_churches.role`. Only a `super_admin` can
  *mint* a leader role: `POST /api/members` rejects a non-`member` role unless the caller
  is `super_admin` (`app/api/members/route.ts:30-35`). A `ministry_leader` can add plain
  members but not leaders.
- **Membership status gate:** access to a church requires `user_churches.status = 'active'`
  (`isActiveMembership()` in `lib/membership.ts`, enforced in `lib/auth.ts` +
  `lib/api/handler.ts`). Statuses `managed` (leader-added, unclaimed), `invited`
  (cross-church invite awaiting consent), and `inactive` do **not** grant access.
- **Multi-church:** a leader may belong to several churches (`user_churches` is per-church).
  Their leader role in one church does **not** carry to another — role is per membership row.

---

## 6. Edge cases / gotchas

- **Phone privacy default hides member phones from group leaders.** With the default
  `member_directory_visibility = 'leaders_only'`, `canViewMemberPhone()`
  (`lib/members/visibility.ts`) returns `false` for `group_leader`, so member phone
  numbers are stripped on the group/ministry pages. A `super_admin` must set
  `'everyone'` (or grant `can_view_member_phone` per-user) to expose them.
- **"View Reports" is currently dark.** The permission is `true`, but the only Reports nav
  target is finance-gated (`feature: 'finance'`), and finance is OFF — so the item won't
  render until finance is re-enabled.
- **Group leader ≠ ministry leader.** They share some read permissions
  (`can_view_visitors`, `can_view_reports`, `can_view_church_needs`) but the ministry
  leader additionally has `can_manage_visitors/events/templates/serving`,
  `can_approve_expenses`, and `can_manage_locations` — none of which a group leader has.
- **Overrides are additive only.** If a group leader "should not" have something they
  appear to have, it was granted at the church-default or per-user layer; the base role
  cannot exceed the defaults on its own (`resolvePermissions`, `lib/permissions.ts`).
