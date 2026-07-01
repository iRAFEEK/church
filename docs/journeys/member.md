# Journey: Member (`member`)

> Derived strictly from code. Ground truth: `lib/permissions.ts`
> (`HARDCODED_ROLE_DEFAULTS.member`), `lib/navigation.ts`, route guards under `app/`,
> and `CLAUDE.md` §3.
> A `member` is the lowest-privilege role. Everything below is the role's default;
> a `super_admin` can additively grant more (church defaults or per-user overrides via
> `/admin/permissions`). Overrides can only *add* `true` (see `resolvePermissions()`).

---

## 1. Who they are

A **regular church member**. They participate — RSVP to events, sign up to serve, read
the Bible, follow announcements, submit prayer requests, join groups — but administer
nothing. Per `CLAUDE.md` §3: "Regular church member. Access controlled by permission flags."

The member's **only** default-`true` capability flag is `can_view_own_giving`; every other
flag in `HARDCODED_ROLE_DEFAULTS.member` is `false` (`lib/permissions.ts:84-99`).

---

## 2. What they CAN do

Nav items whose `roles` array includes `member` (and that carry no gating `permission`)
are available to every member. From `lib/navigation.ts`:

- **Dashboard** → `/dashboard` (`lib/navigation.ts:19-27`). Role-based member dashboard
  (`components/dashboard/MemberDashboard.tsx`), plus the cross-church
  **PendingInvitations** banner (`app/(app)/dashboard/page.tsx`).
- **My Profile** → `/profile` (`lib/navigation.ts:28-36`). View and **edit their own
  profile** (photo, names, contact) via `app/api/profiles/**`.
- **Events** → `/events` (`lib/navigation.ts:108-116`). Browse events and **RSVP** —
  registrations write to `event_registrations` (`app/api/events/**`). Note the `Calendar`
  admin item is separate and needs `can_manage_events`.
- **Serving** → `/serving` (`lib/navigation.ts:147-155`). Browse serving slots and
  **sign up to serve** (`app/api/serving/slots/**`). They cannot create slots —
  `can_manage_serving: false`.
- **Announcements** → `/announcements` (`lib/navigation.ts:156-164`). Read church
  announcements. Cannot author them — `can_manage_announcements: false`.
- **Prayer Requests** → `/prayer` (`lib/navigation.ts:165-173`). **Submit** prayer
  requests and **respond** ("I'm praying") to others'
  (`app/api/church-prayers/route.ts`, `app/api/church-prayers/[id]/pray/route.ts`;
  `components/prayer/*`). They cannot manage the church prayer queue — `can_view_prayers: false`
  gates `/admin/prayers`.
- **Bible** → `/bible` (`lib/navigation.ts:195-203`). Read the Bible and save personal
  **bookmarks + highlights** (`app/api/bible/bookmarks/**`, `app/api/bible/highlights/**`,
  scoped to their `profile_id` + `church_id`).
- **Liturgy** → `/liturgy` (`lib/navigation.ts:204-212`). Read Coptic liturgy resources.
- **Songs** → `/admin/songs` (`lib/navigation.ts:186-194`). Browse songs (read-only for a
  member; `can_manage_songs: false`).
- **Notifications** → `/notifications` (`lib/navigation.ts:174-183`). Receive and read
  in-app notifications (push + in-app are free/always-on).
- **My Giving** → `/finance/my-giving` — `can_view_own_giving: true`
  (`lib/permissions.ts:94`), nav gated by `permission: 'can_view_own_giving'` **and**
  `feature: 'finance'` (`lib/navigation.ts:317-327`). **Finance is OFF** (`CLAUDE.md`
  header), so `/finance/my-giving` is currently redirected by middleware. The permission
  is correct and surfaces once finance is re-enabled.
- **Join groups (request → approve)** — via `/my-group` open-group list a member requests
  to join; the group leader approves (`app/api/groups/[id]/join-requests/route.ts`).
  *(Note: the `My Group` nav item is `roles: ['group_leader']`; a member reaches groups
  through the group detail page / dashboard rather than the leader nav item.)*
- **Accept cross-church invitations** — the `PendingInvitations` banner on the dashboard
  lets a member accept/decline an invite to another church
  (`app/api/churches/invitations` GET/PATCH/DELETE).

**Church Needs is NOT a member default.** The `Church Needs` nav item requires
`permission: 'can_view_church_needs'` (`lib/navigation.ts:214-224`), which is `false` for
members. It appears only if a `super_admin` grants it.

---

## 3. What they CANNOT do

Everything here is `false` in `HARDCODED_ROLE_DEFAULTS.member` (`lib/permissions.ts:84-99`)
unless a `super_admin` grants an override.

- **Cannot view the member directory** — `can_view_members: false`. The `Members` nav item
  and `/admin/members` require `can_view_members`.
- **Cannot see member phone numbers** — `can_view_member_phone: false`, and phone display
  is further church-gated by `canViewMemberPhone()` (`lib/members/visibility.ts`; default
  `leaders_only`).
- **Cannot view or manage visitors** — `can_view_visitors: false` (no Visitors Queue),
  `can_manage_visitors: false`. Members do **not** submit visitors through the app —
  visitor intake is the public QR form (`POST /api/visitors`, unauthenticated), and the
  visitor *manage* handler requires `group_leader`+ (`app/api/visitors/route.ts:115`).
- **Cannot manage** events, templates, serving, announcements, songs, outreach, liturgy,
  locations, church needs, or bookings — all `manage_*` and `can_book_locations` are
  `false` (`can_book_locations: false`, `lib/permissions.ts:98`).
- **Cannot view church-wide reports or prayer management** — `can_view_reports: false`,
  `can_view_prayers: false`.
- **Cannot do anything financial except see their own giving** — all finance flags are
  `false` except `can_view_own_giving`. No submitting expenses (`can_submit_expenses: false`).
- **Cannot see other people's private data** — RLS + `church_id` scoping keeps queries to
  their own church; private prayer requests and admin surfaces are not exposed to members.
- **Cannot reach any `/admin/**` management page** — those guard on `requireRole(...)` or
  `requirePermission(...)` that a member fails (e.g. `/admin/settings*`,
  `/admin/permissions`, `/admin/join-requests` are `super_admin` / `ministry_leader`-only).
- **Cannot add members or approve join-to-church requests** — `POST /api/members` and the
  church join-request approval queue require `ministry_leader` / `super_admin`.

---

## 4. Key journeys

### A. Complete onboarding (self-signup and the leader-added "claim" path)
- **Self-signup path** (`app/onboarding/page.tsx`): after creating an account the member
  searches for their church (`/api/churches/search`), requests to join, completes the
  profile step, and lands on `/dashboard`. Subsequent joins go through the church
  join-request queue (approved by a `ministry_leader`/`super_admin`).
- **Leader-added claim path:** a leader/admin already created a **shadow** identity for
  them via `POST /api/members` (`user_churches.status = 'managed'`, name + optional phone
  pre-filled — see `app/api/members/route.ts`). The member signs in via **WhatsApp OTP**
  as that same user; the app calls `POST /api/members/claim`, which flips all their
  `managed` memberships → `active` and stamps `phone_verified_at`
  (`app/api/members/claim/route.ts`). Their name is already prefilled from the leader-add.
  A pre-added phone counts as **pre-approval** — no join queue.

### B. RSVP an event
1. Open **Events** (`/events`) → tap an event.
2. Tap RSVP / register. Writes an `event_registrations` row via `app/api/events/**`,
   scoped to your `church_id` and `profile_id`.

### C. Sign up to serve
1. Open **Serving** (`/serving`) → pick a serving slot with capacity.
2. Sign up (`app/api/serving/slots/**`; the signup is atomic per the serving-signup RPC).
   Cancel by removing your signup.

### D. Submit a prayer request
1. Open **Prayer Requests** (`/prayer`).
2. Enter the request (optionally private); submit via `app/api/church-prayers/route.ts`.
3. Others can respond "I'm praying" (`app/api/church-prayers/[id]/pray/route.ts`); you can
   respond to theirs too.

### E. Request to join a group
1. Find an **open group** (via `/my-group` open-group list or a group detail page).
2. Tap "Request to join" (`JoinRequestButton`) → creates a pending join request
   (`app/api/groups/[id]/join-requests/route.ts`).
3. The group leader approves or declines. On approval you become a `group_members` row.

### F. Accept a cross-church invitation (PendingInvitations flow)
1. A leader in **another** church added you by a phone that already exists → you got an
   `invited` membership (`app/api/members/route.ts` cross-church branch) and a notification.
2. On your **Dashboard**, the `PendingInvitations` banner
   (`components/churches/PendingInvitations.tsx`) lists the inviting church.
3. Tap **Accept** → `PATCH /api/churches/invitations` flips that membership `invited → active`;
   the church appears in your switcher. Tap **Decline** → `DELETE` removes the invite.

---

## 5. Access & lifecycle notes

- **Two doors to becoming a member:**
  1. **Leader-add + OTP-claim** — a leader creates a `managed` shadow identity
     (`POST /api/members`); the person claims it by signing in via WhatsApp OTP
     (`POST /api/members/claim`), flipping `managed → active`.
  2. **Self-signup + approve** — the person signs up, searches, and joins; a subsequent
     join enters the church join-request queue approved by `ministry_leader`/`super_admin`.
- **Status gate (`user_churches.status`):** only `active` grants app access to a church
  (`isActiveMembership()`, `lib/membership.ts`; enforced in `lib/auth.ts` +
  `lib/api/handler.ts`). `managed` (unclaimed), `invited` (awaiting the member's consent),
  and `inactive` (archived) do **not** reach the app for that church.
- **Multi-church:** a person can belong to several churches; each membership is its own
  `user_churches` row with its own role and status. The church switcher moves between the
  member's `active` churches.

---

## 6. Edge cases / gotchas

- **Leader-added members claim via WhatsApp OTP.** Until they sign in and the claim runs,
  their membership is `managed` and grants **no** access. Claiming is idempotent — safe to
  call after every OTP verification (`app/api/members/claim/route.ts`).
- **Phone-less managed records never claim.** If a leader adds someone with no phone,
  `POST /api/members` synthesizes a placeholder no-reply email for the auth row
  (`app/api/members/route.ts` — `managed+<uuid>@no-reply.ekklesia.app`). That person has no
  credential to sign in with, so the record stays `managed` and unclaimable until a phone
  is attached.
- **Cross-church invites require explicit consent.** A member who already exists is added to
  a *new* church as `invited`, never silently `managed` — they must accept via the
  `PendingInvitations` banner before it activates (`app/api/members/route.ts:76-99`,
  `app/api/churches/invitations/route.ts`).
- **A member granted `can_view_member_phone` can see phones** — an additive per-user
  override (or church default) turns the flag `true`; phone display then also depends on the
  church's `member_directory_visibility` via `canViewMemberPhone()` (`lib/members/visibility.ts`).
- **Finance-off gates "My Giving."** `can_view_own_giving` is `true`, but the nav item and
  route also require the `finance` feature flag, which is OFF — so `/finance/my-giving` is
  currently redirected by middleware (`CLAUDE.md` header).
- **`Church Needs` is not a member default** — it requires `can_view_church_needs`, which is
  `false` for members; it only appears if granted.
