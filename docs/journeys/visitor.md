# Journey: Public Visitor (Unauthenticated Guest)

> Derived from source. Key files cited inline. This is the **only** unauthenticated,
> non-account journey in Ekklesia. Everything here happens without a login.

---

## 1. Who they are

A **first-time guest** of a church — someone who scanned a QR code at the building
or opened a shared welcome/registration link. They have **no account, no session,
and no role**. They exist to the system only as a row in the `visitors` table once
they submit the intake form.

The public routes they can reach are explicitly allowlisted in the auth gate:
`/welcome` and `/join` are listed as public paths in `middleware.ts:10-11`
(`'/welcome' // Church landing page`, `'/join' // QR visitor form`), so no auth
redirect fires for them.

---

## 2. What they CAN do

### Submit the visitor intake form (`/join?church=<id>`)
The QR code leads to `/join?church=<id>`. The page (`app/(public)/join/page.tsx`)
loads with the **service-role admin client** (no session exists) and reads the
church's `visitor_form_config` to render the form dynamically. If `church` is
missing or the church isn't found, it redirects to `/login`
(`app/(public)/join/page.tsx:20-33`).

**The form is per-church configurable.** Migration 056
(`supabase/migrations/056_visitor_form_config.sql`) added
`churches.visitor_form_config JSONB` — each church controls which fields appear
and which are required. Each field entry is `{key, enabled, required}`. The
default config (also duplicated as `DEFAULT_FIELDS` in `join/page.tsx:6-14`) is:

| Field | Enabled by default | Required by default |
|---|---|---|
| `first_name` | yes | **yes** |
| `last_name` | yes | **yes** |
| `phone` | yes | no |
| `email` | yes | no |
| `age_range` | yes | no |
| `occupation` | **no** | no |
| `how_heard` | yes | no |

The form component (`components/visitors/VisitorForm.tsx`) filters to
`enabled` fields only (`:27`) and builds its Zod schema per-config
(`:29-67`). On submit it POSTs `{...values, church_id}` to `/api/visitors`
(`:100-118`) and, on success, routes to `/join/success`.

`age_range` values: `under_18, 18_25, 26_35, 36_45, 46_55, 56_plus`.
`how_heard` values: `friend, social_media, website, event, walk_in, other`
(`lib/schemas/visitor.ts:18-26`).

### Server-side acceptance (`POST /api/visitors`)
This is a **public endpoint — it deliberately does NOT use `apiHandler`** because
there is no session (`app/api/visitors/route.ts:12-14`). Instead it:
- rate-limits via `rateLimitPublic(req)` (`:15-16`),
- validates against `CreateVisitorSchema` (`:20`),
- uses the admin client to insert (`:23`),
- resolves `church_id` from the body, falling back to the first active church if
  none is provided (`:26-40`),
- fires a **welcome WhatsApp** to the visitor, fire-and-forget
  (`notifyWelcomeVisitor`, `:60-62`),
- returns the new visitor row with `status` (defaults to `new`) at HTTP 201.

### View the church landing / welcome page
`/welcome` is public (`middleware.ts:10`). Note in the current code
`app/(public)/welcome/page.tsx` renders the **church registration wizard** (and
redirects logged-in users to `/dashboard`) — i.e. the welcome route today is the
entry point for a *pastor registering a new church*, not a member sign-in. A guest
opening it sees the registration flow.

---

## 3. What they CANNOT do

- **No authenticated access of any kind.** They never obtain a session by filling
  the form (the created record is a `visitors` row, not an auth user).
- **Cannot see any member data.** The public `POST /api/visitors` only writes; the
  read side `GET /api/visitors` requires roles `super_admin | ministry_leader |
  group_leader` (`app/api/visitors/route.ts:115`) and is scoped to
  `church_id` (`:93`). A visitor has none of these.
- **Cannot reach the app.** `/dashboard`, admin pages, and every `/api/*` route
  other than the public visitor POST are behind the auth gate in `middleware.ts`.

---

## 4. Journey (happy path → pipeline → conversion)

1. **Scan / open** — guest scans the church's QR code → lands on
   `/join?church=<churchId>`.
2. **Form renders** — the church's `visitor_form_config` determines which fields
   show (`join/page.tsx:35`).
3. **Fill & submit** — guest completes the form; `VisitorForm` validates client-side,
   then POSTs to `/api/visitors`.
4. **Submitted** — server validates + inserts a `visitors` row with `status = 'new'`,
   fires the welcome WhatsApp, and the guest is routed to `/join/success`.
5. **Enters the visitor pipeline** — the visitor now moves through the status
   lifecycle managed by leaders/admins:

   ```
   new → assigned → contacted → converted
                              ↘ lost
   ```

   These are the exact status values in `UpdateVisitorSchema`
   (`lib/schemas/visitor.ts:33`) and the action transitions in
   `app/api/visitors/[id]/route.ts`:
   - **assign** (`:34-58`) — sets `assigned_to` + `status = 'assigned'`, notifies the
     assigned leader (`notifyVisitorAssigned`).
   - **contact** (`:60-74`) — sets `contact_notes`, `contacted_at`, `status =
     'contacted'`.
   - **convert** — see below.

6. **Leader follows up** — the assigned leader contacts the visitor and logs notes.

### Conversion to member
An admin/leader converts the visitor into a real member identity via
`PATCH /api/visitors/[id]` with `action: 'convert'`
(`app/api/visitors/[id]/route.ts:76-129`):
- Uses the **admin client**; re-reads the visitor scoped by `id` **and**
  `church_id` (`:81-90`).
- Creates an auth user via `auth.admin.createUser` — using the visitor's email, or a
  placeholder `visitor+<id>@placeholder.local` if none (`:93-98`).
- Updates the auto-created `profiles` row with the visitor's name/phone/email/
  occupation, sets `status = 'active'` and `joined_church_at` (`:102-113`).
- Marks the visitor `status = 'converted'` and stamps `converted_to = <new user id>`
  (`:118-124`).

After this, the person is a `member` and enters the member journey.

---

## 5. Edge cases & data-class notes

- **Blank optional fields are accepted.** The public form submits *every enabled
  field*, sending `""` for blanks. `CreateVisitorSchema` preprocesses empty strings
  to `undefined` via `blankToUndefined` so optional `email`/`age_range`/`how_heard`/
  etc. don't fail validation (`lib/schemas/visitor.ts:3-8, 14-28`). This is the fix
  for the real "visitor couldn't submit" bug — a blank email/age/how-heard previously
  triggered "Validation failed" (see `CLAUDE.md` change log, 2026-06-23 mobile-sweep
  entry). A regression test guards it in `app/api/visitors/__tests__/route.test.ts`.

- **`church_id` fallback.** If the POST body has no `church_id`, the server resolves
  the first `is_active = true` church ordered by `created_at`
  (`app/api/visitors/route.ts:26-40`); returns HTTP 400 "No active church found" if
  there is none.

- **Visitor phone is NOT gated by member-directory privacy.** The
  `member_directory_visibility` control (migration 081 / `canViewMemberPhone`)
  governs **member** phone visibility only. Visitor phone numbers are a **different
  data class** and are intentionally out of scope for that gate — they are shown to
  leaders in the visitor queue (`GET /api/visitors` selects `phone`,
  `app/api/visitors/route.ts:90`) regardless of the church's member-directory
  setting. This is called out explicitly in `CLAUDE.md` ("Out of scope (different
  consent class): visitor phones …").

- **Rate limited & public.** The endpoint is rate-limited (`rateLimitPublic`) and
  errors return generic messages (422 for validation with a `fields` map, 500
  otherwise) — no internal detail leaks (`app/api/visitors/route.ts:66-74`).
