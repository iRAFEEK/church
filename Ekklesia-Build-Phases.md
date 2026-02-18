# EKKLESIA — Church Management Platform
## Complete Build Phases & Task Breakdown

**Stack:** Next.js · Supabase · shadcn/ui · Tailwind · Twilio · Resend · Vercel

---

## How to Use This Document

Each phase is self-contained. Complete every task in a phase before starting the next. Each task tells you exactly what to build, which files to create, and what the done state looks like.

- Complete phases in order — later phases depend on earlier ones.
- Use the task tables as your daily checklist. One task at a time.
- Check the **Phase Complete When** gate at the end of each phase before moving on.
- Use AI tools (Cursor, Claude) for implementation — these tasks are scoped to work well with AI-assisted coding.
- Never start building UI before the database and API layer for that module are working.

> ⚠️ **Do not skip phases or build out of order.** The database schema and auth layer in Phase 1 are the foundation everything else depends on.

> 💡 Estimated efforts assume one developer using AI coding tools heavily. Purely coding time, not calendar time.

---

## Phase Summary

| Phase | Name | Key Deliverable | Effort | Cumulative |
|-------|------|----------------|--------|------------|
| 1 | Foundation & Profiles | Auth, profiles, app shell | 2–3 wks | 3 wks |
| 2 | Visitors & Groups | QR pipeline, group management | ~2 wks | 5 wks |
| 3 | Attendance & Prayer | Gatherings, at-risk, prayer | ~2 wks | 7 wks |
| 4 | Notifications & Events | Twilio live, event registration | ~2 wks | 9 wks |
| 5 | Serving & Announcements | Service plans, targeted comms | ~1.5 wks | 10.5 wks |
| 6 | Songs & Bible | Song DB, setlists, Bible search | ~1 wk | 11.5 wks |
| 7 | Pastoral Care & Reports | Care CRM, dashboards, exports | ~1.5 wks | 13 wks |
| 8 | Polish & Launch | Multi-church, security, prod | ~2 wks | 15 wks |

---

# PHASE 1 — Foundation, Auth & Profiles
**The bedrock. Nothing else works without this. · Est. 2–3 weeks**

Phase 1 is the most critical phase. It establishes your project structure, database, authentication, role system, and the core member profile. Every subsequent phase builds directly on top of this. Take your time here — a clean foundation saves weeks later.

---

## 1.1 — Project & Tooling Setup

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Bootstrap Next.js App | `npx create-next-app@latest ekklesia --typescript --tailwind --app` | Running Next.js app |
| 2 | Install core dependencies | `@supabase/supabase-js @supabase/ssr shadcn/ui zod react-hook-form` | package.json complete |
| 3 | Init shadcn/ui | `npx shadcn@latest init` — choose default style, zinc base color | components/ui/ ready |
| 4 | Configure Tailwind for RTL | Add `rtl:` variant support in `tailwind.config.ts`. Set `dir='rtl'` on html tag for AR. | RTL classes work |
| 5 | Set up env variables | `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | .env.local complete |
| 6 | Configure folder structure | `/app /components /lib /hooks /types /utils /styles` — establish before writing any feature code | Structure defined |
| 7 | Set up GitHub repo | Init repo, push initial commit, connect to Vercel for auto-deploy on push to main | CI/CD live |

---

## 1.2 — Supabase Setup

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create Supabase project | Region: eu-west-1 (closest to Middle East). Note URL and anon key. | Project live |
| 2 | Create churches table | `id uuid PK, name, name_ar, country, timezone, primary_language, welcome_message, visitor_sla_hours, is_active` | Table created |
| 3 | Create profiles table | `id uuid FK→auth.users, church_id, first/last name + AR versions, phone, email, DOB, gender, occupation, photo_url, role, status, joined_church_at, invited_by, notification_pref` | Table created |
| 4 | Create profile_milestones table | `id, profile_id, church_id, type, title, date, notes` | Table created |
| 5 | Enable RLS on all tables | `ALTER TABLE churches ENABLE ROW LEVEL SECURITY;` — repeat for all tables | RLS enabled |
| 6 | Write RLS policies — profiles | Users read own row. Leaders read members of their groups (subquery). Admins read all in `church_id`. | Policies active |
| 7 | Create Storage buckets | `church-assets` (public), `profile-photos` (authenticated). Set max file size 5MB. | Buckets ready |
| 8 | Create trigger: on new auth user | Postgres function that auto-inserts a basic profile row when a new `auth.user` is created. | Trigger live |
| 9 | Seed test data | One church row. 3 profiles: `super_admin`, `group_leader`, `member`. Use Supabase dashboard. | Test data ready |

---

## 1.3 — Supabase Client & Middleware

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create Supabase browser client | `/lib/supabase/client.ts` — `createBrowserClient()` from `@supabase/ssr` | Client ready |
| 2 | Create Supabase server client | `/lib/supabase/server.ts` — `createServerClient()` using `cookies()` | Server client ready |
| 3 | Create auth middleware | `/middleware.ts` — check session on every request, redirect to `/login` if not authenticated | Auth gate works |
| 4 | Create getCurrentUser helper | `/lib/auth.ts` — `getCurrentUserWithRole()` returns profile + role. Used in all server components. | Helper ready |
| 5 | Create TypeScript types | `/types/index.ts` — Church, Profile, Group, Visitor etc. Mirror DB schema exactly. | Types ready |
| 6 | Church scoping middleware | Extract `church_id` from user profile on every request. Attach to request context. | Church isolation works |

---

## 1.4 — Auth UI

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build /login page | `/app/(auth)/login/page.tsx` — email + password form using shadcn Form + Input + Button | Login works |
| 2 | Build onboarding page | `/app/onboarding/page.tsx` — First login: enter name, Arabic name, phone, photo, DOB, occupation | Onboarding works |
| 3 | Build sign out | Server action: `supabase.auth.signOut()` + redirect to `/login` | Sign out works |
| 4 | Auth layout wrapper | `/app/(auth)/layout.tsx` — centered card layout for login/onboarding pages | Auth layout done |
| 5 | Protected layout wrapper | `/app/(app)/layout.tsx` — sidebar + topbar shell. Checks session. Redirects if not authed. | App shell done |

---

## 1.5 — App Shell & Navigation

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build sidebar component | `/components/layout/Sidebar.tsx` — nav links change based on role. Collapsible. RTL-aware. | Sidebar renders |
| 2 | Build topbar component | `/components/layout/Topbar.tsx` — church name, user avatar, notifications bell, language toggle | Topbar renders |
| 3 | Language toggle | Toggle between AR (RTL) and EN (LTR). Store in localStorage. Apply `dir` attribute to `<html>`. | Language switch works |
| 4 | Role-based nav | Define nav items per role in `/lib/navigation.ts`. Sidebar filters items by current user role. | Nav is role-aware |
| 5 | Build 404 and error pages | `/app/not-found.tsx` and `/app/error.tsx` — simple styled pages | Error pages done |

---

## 1.6 — Member Profile Module

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build profile page (own) | `/app/(app)/profile/page.tsx` — shows all profile fields, photo, milestones, groups | Profile view works |
| 2 | Build profile edit form | `/app/(app)/profile/edit/page.tsx` — react-hook-form + zod. All fields. Photo upload to Supabase Storage. | Profile edit works |
| 3 | Photo upload component | `/components/profile/PhotoUpload.tsx` — drag/drop or click, preview, upload to `profile-photos` bucket | Photo upload works |
| 4 | Build member directory (admin) | `/app/(app)/admin/members/page.tsx` — table with search, filter by role/status/group. Pagination. | Directory works |
| 5 | Build member detail page (admin) | `/app/(app)/admin/members/[id]/page.tsx` — full profile. Admin can change role. See all groups, stats. | Member detail works |
| 6 | Add milestone | `/components/profile/AddMilestone.tsx` — modal to add baptism, Bible plan, etc. `POST /api/profiles/:id/milestones` | Milestones work |
| 7 | Profile API routes | `/app/api/profiles/route.ts` (GET list), `/app/api/profiles/[id]/route.ts` (GET, PATCH) | Profile APIs done |

---

### ✅ Phase 1 Complete When:
- [ ] You can log in, complete onboarding, and see your profile.
- [ ] Admin can view the member directory and open any member's profile.
- [ ] Profile photo uploads and saves correctly.
- [ ] Role-based navigation shows correct items per user type.
- [ ] RTL/LTR toggle works across the whole app.
- [ ] Supabase RLS is blocking data across different churches.
- [ ] CI/CD deploys cleanly to Vercel on every push.

---

# PHASE 2 — Visitor Pipeline & Group Management
**How new people enter and how the church is organized. · Est. ~2 weeks**

Phase 2 adds the two foundational operational modules: bringing new people in through the visitor pipeline, and organizing the church into ministries and groups. By the end of this phase, a church can onboard new visitors and structure their groups.

---

## 2.1 — Database: Visitors, Groups, Ministries

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create visitors table | `id, church_id, first_name, last_name, phone, email, age_range, occupation, how_heard, visited_at, status, assigned_to, contacted_at, contact_notes, escalated_at` | Table created |
| 2 | Create ministries table | `id, church_id, name, name_ar, leader_id, description, is_active` | Table created |
| 3 | Create groups table | `id, church_id, ministry_id, name, name_ar, type, leader_id, co_leader_id, meeting_day, meeting_time, meeting_location, meeting_frequency, max_members, is_open, is_active` | Table created |
| 4 | Create group_members table | `id, group_id, profile_id, church_id, joined_at, role_in_group, is_active` | Table created |
| 5 | RLS: visitors | Assigned leader reads/updates their visitors. Admin reads/updates all in church. | RLS active |
| 6 | RLS: groups + group_members | Group leader reads/updates their group. Members read own groups. Admin reads all. | RLS active |

---

## 2.2 — Visitor Pipeline: Public QR Form

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build /join public page | `/app/(public)/join/page.tsx` — NO auth required. Beautiful landing page. Church logo. Welcoming copy. | Form renders |
| 2 | Build visitor form | Fields: first name, last name, phone, email, age range (dropdown), occupation, how_heard (dropdown). react-hook-form + zod. | Form validates |
| 3 | POST /api/visitors | Public route. Insert into visitors table. Send welcome WhatsApp/SMS via Twilio using `church.welcome_message`. Return success. | Submission works |
| 4 | Thank you page | `/app/(public)/join/success/page.tsx` — warm message, church info, what to expect next. | Thank you page done |
| 5 | Dynamic church QR support | `/join?church=[church_id]` — form auto-loads correct church name, logo, welcome message. | QR flow works |
| 6 | QR code generator for admin | `/admin/settings/qr` — generates QR pointing to `/join?church=id`. Downloadable PNG. | QR code downloadable |

---

## 2.3 — Visitor Pipeline: Admin Management

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build visitor queue page (admin) | `/app/(app)/admin/visitors/page.tsx` — list of new visitors, status badges, SLA countdown timer per visitor. | Queue visible |
| 2 | Assign visitor to leader | Modal: admin picks a group leader from dropdown. `PATCH /api/visitors/:id/assign`. Leader gets notified. | Assignment works |
| 3 | Leader: my assigned visitors | `/app/(app)/visitors/page.tsx` (leader view) — list of visitors assigned to them. Contact action. | Leader view works |
| 4 | Mark as contacted | Leader opens visitor, logs contact notes, clicks 'Mark as Contacted'. `PATCH /api/visitors/:id/contact`. | Contact tracking works |
| 5 | Convert visitor to member | Once added to a group: `PATCH /api/visitors/:id/convert` — creates profile from visitor data, links group_members. | Conversion works |
| 6 | SLA badge logic | In visitor list UI: if `(now - visited_at) > church.visitor_sla_hours` and `status = 'new'`, show red badge. | SLA alerts visible |
| 7 | Visitor escalation API | `GET /api/visitors/escalations` — returns all SLA-breached, unassigned visitors for admin dashboard. | Escalation API done |

---

## 2.4 — Ministry & Group Management

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build ministries CRUD (admin) | `/admin/groups/ministries` — list, create, edit ministries. Assign ministry leader. | Ministries work |
| 2 | Build groups list page | `/admin/groups` — table of all groups. Filter by ministry, type, active. Shows member count, leader name. | Group list works |
| 3 | Build create/edit group form | All fields: name, AR name, type, ministry, leader, co-leader, meeting day/time/location/frequency, max members, open toggle. | Group CRUD done |
| 4 | Build group detail page (admin) | `/admin/groups/[id]` — info panel, member roster table, health indicators, leader contact. | Group detail works |
| 5 | Group leader dashboard | `/groups/[id]/page.tsx` (leader view) — their group info, roster, upcoming gathering card, at-risk members. | Leader view works |
| 6 | Add member to group | Admin/leader: search members by name, click add → `POST /api/groups/:id/members`. Confirmation. | Add member works |
| 7 | Remove member from group | Soft-remove: `is_active = false` on group_members row. Member still exists in profiles. | Remove member works |
| 8 | Group APIs | `/api/groups` (GET, POST), `/api/groups/[id]` (GET, PATCH), `/api/groups/[id]/members` (POST, DELETE) | APIs done |

---

### ✅ Phase 2 Complete When:
- [ ] A visitor can scan a QR code, fill the form, and receive a WhatsApp welcome message.
- [ ] Admin can see all visitors in the queue with SLA status.
- [ ] Admin can assign a visitor to a leader. Leader gets notified.
- [ ] Leader can mark visitor as contacted with notes.
- [ ] Visitor can be converted to a full member profile and added to a group.
- [ ] Admin can create ministries and groups, assign leaders, manage rosters.
- [ ] Group leader can see their group and their assigned members.

---

# PHASE 3 — Attendance, Gatherings & Prayer
**The core weekly loop that keeps people accountable. · Est. ~2 weeks**

This is the operational heart of the app. Group leaders use this module every single week. It must be fast, reliable, and feel effortless. Attendance takes under 60 seconds. Prayer requests persist and are tracked over time.

> ⚠️ **This is the make-or-break feature.** If group leaders find it slow or confusing, the whole platform fails. Spend extra time on UX. Test it with a real leader before moving to Phase 4.

---

## 3.1 — Database: Gatherings, Attendance, Prayer

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create gatherings table | `id, group_id, church_id, scheduled_at, actual_start, location, topic, notes, status, created_by` | Table created |
| 2 | Create attendance table | `id, gathering_id, group_id, profile_id, church_id, status (present/absent/excused/late), excuse_reason, marked_by, marked_at` | Table created |
| 3 | Create prayer_requests table | `id, gathering_id, group_id, church_id, submitted_by, content, is_private, status (active/answered/archived), resolved_at, resolved_notes` | Table created |
| 4 | RLS: gatherings | Group leader reads/writes own group. Members read their group's gatherings. Admin reads all. | RLS active |
| 5 | RLS: attendance | Leader inserts/updates for their group. Members read own attendance. Admin reads all. | RLS active |
| 6 | RLS: prayer_requests | Leader reads all in group. Members read non-private. `is_private` = leader-only read. | RLS active |

---

## 3.2 — Gathering Auto-Generation

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Gathering generation logic | `/lib/gatherings.ts` — `generateUpcomingGatherings(group)` uses `meeting_day + meeting_time` to calculate next date. | Logic ready |
| 2 | Edge Function: generate-gatherings | Runs every Monday. Loops all active groups. Inserts next gathering record if one doesn't exist for that week. | Cron working |
| 3 | Manual gathering creation | Leader can also create a one-off gathering from group page. Form: date, time, optional location override, topic. | Manual creation works |
| 4 | Gathering API | `POST /api/gatherings`, `GET /api/gatherings/[id]`, `GET /api/groups/[id]/gatherings` (past + upcoming) | APIs done |

---

## 3.3 — Attendance Taking UI

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build gathering detail page (leader) | `/app/(app)/groups/[id]/gathering/[gatheringId]/page.tsx` — four sections: attendance, prayer requests, notes, summary. | Page renders |
| 2 | Build attendance roster component | `/components/gathering/AttendanceRoster.tsx` — shows all active group members. Each row: photo, name, 4 status buttons (Present/Late/Excused/Absent). Tap = instant update. | Roster works |
| 3 | Bulk attendance submit | `POST /api/gatherings/[id]/attendance` — sends array of `{profile_id, status}` objects. Upserts all records in one transaction. | Bulk submit works |
| 4 | Attendance quick-complete UX | Default all to 'absent'. Leader only taps people who ARE present. One submit button at bottom. Show count: 'X of Y present'. | Fast UX complete |
| 5 | Gathering notes field | Simple textarea for topic + general notes. Saves on blur or via save button. `PATCH /api/gatherings/[id]` | Notes save |
| 6 | Mark gathering as complete | Leader presses 'Complete Gathering' → status = completed → triggers absence check. | Completion works |

---

## 3.4 — Absence Detection & At-Risk Flagging

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Absence streak logic | `/lib/absence.ts` — `getConsecutiveAbsences(profile_id, group_id)` — queries last N gatherings, counts streak of absences. | Logic ready |
| 2 | Edge Function: check-member-absence | Triggered after gathering is marked complete. For each member: calculate streak. If >= 2 absences: update `profiles.status = 'at_risk'`. Insert notification for leader. | Cron working |
| 3 | At-risk display on group page | Group leader home: 'At Risk' section with members flagged + last attendance date + days since seen. | At-risk visible |
| 4 | At-risk API | `GET /api/profiles/at-risk` — returns all at-risk members for admin dashboard, filterable by group. | API done |
| 5 | Mark as resolved / followed up | Leader can mark 'I've followed up with this person' — clears at-risk flag, logs note. | Resolution works |

---

## 3.5 — Prayer Requests

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Add prayer request form | `/components/gathering/AddPrayer.tsx` — modal with text field, privacy toggle. Submit → `POST /api/gatherings/[id]/prayer` | Add prayer works |
| 2 | Prayer request list component | `/components/gathering/PrayerList.tsx` — shows all requests for this gathering. Private ones marked with lock icon (leader only). | Prayer list renders |
| 3 | Persistent prayer feed on group page | Group page shows all ACTIVE prayer requests across all gatherings — not just latest. Ongoing intercession view. | Persistent feed works |
| 4 | Resolve / archive prayer request | Leader marks request as 'answered' with optional note. Status = answered. Moves to archive. | Resolution works |
| 5 | Prayer request on member profile | Member profile shows their prayer requests history (private ones only visible to leader/admin). | Profile integration done |

---

## 3.6 — Attendance History & Stats

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Member attendance history | `/components/profile/AttendanceHistory.tsx` — list of all gatherings with status badge. Used on member profile page. | History renders |
| 2 | Group attendance stats | Group page header: average attendance %, total gatherings held, trend arrow (up/down vs last 4 weeks). | Group stats visible |
| 3 | Attendance API for profile | `GET /api/profiles/[id]/attendance` — returns all attendance records with gathering dates and statuses. | API done |
| 4 | Group gathering history list | `/components/group/GatheringHistory.tsx` — past gatherings with date, attendance count, completion status. | History renders |

---

### ✅ Phase 3 Complete When:
- [ ] Gatherings are auto-generated weekly for all active groups.
- [ ] Leader can take attendance for their group in under 60 seconds.
- [ ] Submitting attendance triggers absence detection correctly.
- [ ] Members with 2+ consecutive absences are flagged as at-risk.
- [ ] Leader sees at-risk members prominently on their group page.
- [ ] Prayer requests can be added, marked private, and resolved.
- [ ] Member profile shows attendance history.

---

# PHASE 4 — Notifications & Events
**How the church communicates and gathers beyond small groups. · Est. ~2 weeks**

Phase 4 adds the communication backbone and event management. Notifications make the app feel alive. Events handle everything from Sunday services to conferences to open community nights.

---

## 4.1 — Notifications Infrastructure

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create notifications_log table | `id, church_id, profile_id, type, channel, payload jsonb, status, reference_id, reference_type, sent_at` | Table created |
| 2 | Install and configure Twilio SDK | `npm install twilio`. `/lib/twilio.ts` — init client with credentials. `sendWhatsApp()` and `sendSMS()` helpers. | Twilio ready |
| 3 | Install and configure Resend | `npm install resend`. `/lib/resend.ts` — init with `RESEND_API_KEY`. `sendEmail()` helper. | Resend ready |
| 4 | Notification dispatcher | `/lib/notifications.ts` — `sendNotification({profile_id, type, message, channel})`. Routes to correct provider. Logs to `notifications_log`. | Dispatcher works |
| 5 | In-app notification feed | `notifications_log` rows with `channel=in_app` shown in bell icon dropdown in topbar. Mark as read. | In-app feed works |
| 6 | User notification preferences | Respect `profile.notification_pref` (whatsapp/sms/email/all) when dispatching. | Prefs respected |

---

## 4.2 — Automated Notification Triggers

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Gathering reminder cron | Edge Function: runs daily at 8am. Finds all gatherings in next 24h. Sends WhatsApp reminder to each member in that group. | Reminders sending |
| 2 | Visitor assignment notification | When visitor is assigned to a leader → WhatsApp to leader: 'New visitor assigned to you: [name]. Please reach out.' | Assignment notify works |
| 3 | At-risk member notification | When member flagged at-risk → WhatsApp to group leader: '[Name] has been absent for X weeks. Would you like to reach out?' | At-risk notify works |
| 4 | Visitor SLA escalation cron | Edge Function: runs hourly. Finds visitors past SLA with no contact → notifies admin → sets `escalated_at`. | SLA escalation works |
| 5 | Serving invite notification | WhatsApp to person when assigned to a serving role: 'We'd love for you to serve on [team] this [date]. Reply in the app.' | Serving invite works |
| 6 | Twilio webhook endpoint | `POST /api/webhooks/twilio` — handles delivery receipts. Updates `notifications_log.status` to delivered/failed. | Webhook working |

---

## 4.3 — Events Database

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create events table | `id, church_id, created_by, title, title_ar, description, event_type, starts_at, ends_at, location, capacity, is_public, registration_required, registration_closes_at, target_audience jsonb, status` | Table created |
| 2 | Create event_registrations table | `id, event_id, church_id, profile_id (nullable), visitor_id (nullable), name, phone, email, status, registered_at, check_in_at` | Table created |
| 3 | RLS: events | All authenticated users read. Admin/leader write. Public events readable without auth. | RLS active |
| 4 | RLS: event_registrations | Members read own registrations. Admin reads all for their church's events. | RLS active |

---

## 4.4 — Events UI

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build event creation form (admin) | `/admin/events/create` — title, AR title, description, type, dates, location, capacity, `is_public` toggle, target audience selector, registration settings. | Create form works |
| 2 | Build events list page (member) | `/events` — card grid of upcoming events. Filter: all / my groups / church-wide. Register button on each. | Events list works |
| 3 | Build event detail page | `/events/[id]` — full event info, countdown timer, register button, registrant count if visible. | Detail page works |
| 4 | Member registration flow | Authenticated: `POST /api/events/[id]/register` with `profile_id`. Shows confirmation. Calendar add link. | Member registration works |
| 5 | Public registration flow | Non-member visits `/events/[id]` if `is_public`. Fills name, phone, email → creates visitor record + registers. | Public registration works |
| 6 | Event check-in UI (admin/leader) | `/admin/events/[id]/checkin` — searchable list of registrants. Tap to check in. Shows confirmed count live. | Check-in works |
| 7 | Event reminder cron | Edge Function: 24h before event → WhatsApp reminder to all registrants. | Event reminders work |
| 8 | Post-event visitor follow-up | After event: non-member registrants who attended are flagged in visitor queue for follow-up. | Follow-up queue works |

---

### ✅ Phase 4 Complete When:
- [ ] WhatsApp messages are sending via Twilio for all key triggers.
- [ ] Email notifications are sending via Resend.
- [ ] Gathering reminders send automatically 24h before each meeting.
- [ ] At-risk member notifications reach group leaders.
- [ ] Admin can create events visible to the right audience.
- [ ] Members can register for events in-app.
- [ ] Non-members can register for public events via web form.
- [ ] Delivery receipts update notification status in DB.

---

# PHASE 5 — Serving Teams & Announcements
**Who serves, when, and how the church stays informed. · Est. ~1.5 weeks**

Phase 5 completes the operational layer. Serving teams handle the Sunday logistics that currently live in group chats and phone calls. Announcements replace the WhatsApp broadcast chaos with a structured, targeted communication system.

---

## 5.1 — Serving Teams Database

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create serving_teams table | `id, church_id, ministry_id, name, name_ar, leader_id, color, is_active` | Table created |
| 2 | Create serving_team_members table | `id, team_id, profile_id, church_id, schedule_type (recurring/rotating/invited), is_active, joined_at` | Table created |
| 3 | Create service_plans table | `id, church_id, event_id, title, service_date, created_by, status (planning/confirmed/completed)` | Table created |
| 4 | Create serving_assignments table | `id, service_plan_id, team_id, profile_id, church_id, role_label, invitation_sent_at, response (pending/confirmed/declined), responded_at, decline_reason, is_recurring` | Table created |
| 5 | RLS: serving tables | Team leader reads/writes their team's assignments. Assigned person reads/updates own assignment. Admin reads all. | RLS active |

---

## 5.2 — Serving Teams UI

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build serving teams management (admin) | `/admin/serving/teams` — list all teams with color badge. Create/edit team. Assign leader. | Teams management works |
| 2 | Team roster management | `/admin/serving/teams/[id]` — view team members. Add person from member directory. Set `schedule_type`. | Roster management works |
| 3 | Service plan creation | `/admin/serving/plans/create` — select date, link to event (optional), title. Creates service plan shell. | Plan creation works |
| 4 | Build service plan detail (coordinator) | `/admin/serving/plans/[id]` — shows each team with their slots. Add/remove assignments. See response status per person. | Plan detail works |
| 5 | Add assignment + send invite | Select team → search and pick person → assign role label → `POST /api/serving/plans/:id/assignments` → triggers WhatsApp invite. | Assignment + invite works |
| 6 | Member: respond to serving invite | `/serving` page — list of pending invitations with event info. Accept / Decline buttons. `PATCH /api/serving/assignments/:id/respond`. | Response flow works |
| 7 | Service plan summary view | `GET /api/serving/plans/:id/summary` — all teams, all assignments, confirmation status. Used in pre-service check. | Summary works |
| 8 | Serving history on member profile | Profile page: 'Serving History' tab showing all past serving assignments with date and role. | History on profile |
| 9 | Recurring serving auto-assign | When new service plan created, auto-insert assignments for members with `schedule_type=recurring`. Still sends reminder (not invite). | Auto-assign works |

---

## 5.3 — Announcements

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create announcements table | `id, church_id, created_by, title, body, target jsonb, channel text[], scheduled_at, sent_at, status, attachment_url` | Table created |
| 2 | Build announcement creation form | `/admin/announcements/create` — title, rich body, target selector (all/groups/ministries), channels (WhatsApp/email/in-app), schedule toggle. | Create form works |
| 3 | Audience targeting engine | `/lib/announcements.ts` — `getAudienceProfiles(target)` — resolves target jsonb to array of `profile_ids` with their notification prefs. | Targeting works |
| 4 | Send immediately | `POST /api/announcements` — dispatches to all resolved profiles via their preferred channel. Logs each to `notifications_log`. | Immediate send works |
| 5 | Scheduled announcements cron | Edge Function: runs every 15min. Finds announcements with `scheduled_at <= now` and `status=scheduled`. Dispatches and marks sent. | Scheduling works |
| 6 | Announcements feed (member) | `/announcements` — reverse chronological feed of all announcements targeting this user. Church-wide + their groups. | Feed works |
| 7 | Group-level announcements (leader) | Group leader can send announcements scoped to just their group. Same create form, pre-targeted. | Group announce works |
| 8 | Attachment support | Upload PDF/image to Supabase Storage → URL stored in announcement. Included in message link. | Attachments work |

---

### ✅ Phase 5 Complete When:
- [ ] Admin can build a service plan and assign people to serving roles.
- [ ] Assigned person receives WhatsApp invitation and can accept/decline in app.
- [ ] Coordinator sees real-time confirmation status for each team.
- [ ] Members with recurring schedule are auto-assigned to new service plans.
- [ ] Admin/leader can send a church-wide or targeted announcement.
- [ ] Scheduled announcements send at the correct time.
- [ ] Member sees all their announcements in a feed.

---

# PHASE 6 — Resources: Songs & Bible
**Tools that make every ministry more effective. · Est. ~1 week**

Phase 6 adds the resource layer. Song database for worship teams. Bible integration for pastors, teachers, and members. These are self-contained modules that don't depend on the operational flow.

---

## 6.1 — Song Database

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create songs table | `id, church_id, title, title_ar, artist, language, lyrics, lyrics_ar, default_key, tempo, youtube_url, audio_url, chord_chart_url, tags text[], is_active` | Table created |
| 2 | Create setlists and setlist_songs tables | `setlists`: id, church_id, service_plan_id, created_by, title, service_date, notes. `setlist_songs`: setlist_id, song_id, order_index, key_override, notes. | Tables created |
| 3 | Build song library page | `/admin/songs` — searchable table. Filter by language, tempo, key, tags. Shows title, artist, key, tempo. | Library works |
| 4 | Build song detail/edit page | `/admin/songs/[id]` — all fields editable. Lyrics display with formatting. Links to YouTube. Upload audio + chord chart to Storage. | Song detail works |
| 5 | Song search with full-text | Supabase full-text search on title + lyrics + artist. Instant results as user types. | Search works |
| 6 | Build setlist creator | `/admin/songs/setlists/create` — pick songs from library, drag to reorder, set key overrides. Link to service plan. | Setlist builder works |
| 7 | Setlist view for team | Worship team members can view the setlist for their upcoming service. Lyrics available inline. Key shown. | Team setlist view works |
| 8 | Setlist history | Past setlists attached to past service plans. Worship leader can see what was sung on any date. | History works |

---

## 6.2 — Bible Integration

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Set up API.Bible account | Register at api.bible. Get API key. Add `BIBLE_API_KEY` to `.env`. Test with curl. | API key works |
| 2 | Bible API client | `/lib/bible.ts` — `bibleSearch(query, version)`, `getVerse(verseId, version)`, `getPassage(start, end, version)`. Add error handling. | Client ready |
| 3 | Cache Bible responses | Popular verses cached in Supabase table (`bible_cache`: id, verse_id, version, content, cached_at) to reduce API calls. | Caching works |
| 4 | Build Bible search page | `/bible` — search box. Results show verse reference + text. Click to expand full passage. Toggle AR/EN version. | Search page works |
| 5 | Version selector | AR: Van Dyck (avd) and Arabic Bible (arb). EN: ESV and NIV. User picks preferred default saved to profile. | Version toggle works |
| 6 | Verse display component | `/components/bible/VerseDisplay.tsx` — shows reference, text, copy button, share button. Used across app. | Component ready |
| 7 | Bible proxy API routes | `GET /api/bible/search`, `GET /api/bible/verse` — proxy through to api.bible with API key on server. Never expose key to client. | API routes done |
| 8 | Bible integration in gatherings | In gathering notes page: 'Add Scripture' button opens Bible search. Selected verse added to gathering notes. | Integration works |

---

### ✅ Phase 6 Complete When:
- [ ] Worship leader can search song library and build a setlist.
- [ ] Setlist is linked to a service plan and visible to the team.
- [ ] Bible search returns results in Arabic and English.
- [ ] Verse display works cleanly across the app.
- [ ] API key is never exposed to the client (server-side proxy only).
- [ ] Common verses are cached to reduce external API calls.

---

# PHASE 7 — Pastoral Care & Reports
**Deep visibility for leadership. Nobody gets lost. · Est. ~1.5 weeks**

Phase 7 gives church leadership the tools to act on everything that's been tracked. Pastoral care is the private layer where pastors log interactions, care for individuals, and follow up. Reports turn all the data into decisions.

---

## 7.1 — Pastoral Care CRM

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Create pastoral_notes table | `id, church_id, about_profile_id, written_by, content, type (general/visit/call/counseling/prayer), is_sensitive, follow_up_date, followed_up_at` | Table created |
| 2 | RLS: pastoral_notes | Only `ministry_leader` and above can read/write. `is_sensitive = true` → `super_admin` only. | RLS active |
| 3 | Build pastoral notes section on member profile | `/admin/members/[id]` — 'Pastoral Care' tab visible only to leadership. Shows note history. Add note button. | Tab visible + working |
| 4 | Add pastoral note form | Modal: type selector, content textarea, sensitive toggle, optional `follow_up_date`. `POST /api/pastoral-notes`. | Add note works |
| 5 | Follow-up reminders | Edge Function: daily cron. Finds `pastoral_notes` with `follow_up_date = today` and `followed_up_at is null`. Sends in-app + WhatsApp to the pastor who wrote it. | Reminders sending |
| 6 | Mark follow-up done | Pastor receives reminder → opens note → clicks 'Followed Up' → sets `followed_up_at = now`. Optional outcome note. | Completion works |
| 7 | Pending follow-ups widget | Admin dashboard: widget showing all overdue follow-ups across all pastors. Count + clickable list. | Widget visible |
| 8 | Care activity log | Member profile: timeline view of all care interactions — calls, visits, prayer, counseling — chronologically. | Timeline renders |

---

## 7.2 — Leadership Dashboard

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Build admin overview dashboard | `/admin` — stat cards: total members, new this month, at-risk count, upcoming events, uncontacted visitors, pending follow-ups. | Dashboard renders |
| 2 | Attendance trend chart | Line chart: total church attendance over last 12 weeks. Use recharts. Data from `GET /api/dashboard/overview`. | Chart works |
| 3 | Group health score cards | Grid of group cards. Each shows: name, leader, member count, 4-week attendance %, trend arrow, at-risk count. | Health cards visible |
| 4 | Group health score algorithm | `/lib/health.ts` — score = (avg attendance rate × 0.5) + (growth rate × 0.3) + (prayer activity × 0.2). Returns 0–100. | Score algorithm done |
| 5 | Serving coverage widget | Next service: for each team shows confirmed/total ratio. Red if under 60%. Green if full. | Coverage widget works |
| 6 | Visitor conversion funnel | Funnel chart: Visited → Assigned → Contacted → Joined. Shows count at each stage and conversion %. | Funnel renders |

---

## 7.3 — Reports & Exports

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Attendance report | `GET /api/reports/attendance` — filter by date range, group, ministry. Returns per-person attendance breakdown. CSV export. | Report works |
| 2 | Member growth report | Chart: new members joined per month over last 12 months. Table: all members with join date, invited by, current status. | Report works |
| 3 | Visitor conversion report | Table: all visitors with status, days to contact, days to join. Sortable. CSV export. | Report works |
| 4 | Serving report | Table: members sorted by total serving count (year). Shows most active servers. Useful for recognition. | Report works |
| 5 | CSV export utility | `/lib/export.ts` — `arrayToCSV(data, columns)`. Used across all reports. Triggers file download in browser. | Export works |
| 6 | Reports page (admin) | `/admin/reports` — tabbed page: Attendance / Members / Visitors / Serving. Each tab has its report + export button. | Reports page done |

---

### ✅ Phase 7 Complete When:
- [ ] Leadership can add private pastoral notes to any member.
- [ ] Follow-up reminders fire on the set date.
- [ ] Admin dashboard shows correct stat cards and trends.
- [ ] Group health scores are calculated and displayed correctly.
- [ ] All four reports generate with correct data.
- [ ] CSV export downloads work in browser.
- [ ] Sensitive pastoral notes are only visible to super_admin.

---

# PHASE 8 — Multi-Church, Polish & Launch Prep
**Scale the platform. Make it production-ready. · Est. ~2 weeks**

Phase 8 transforms the app from a single-church tool into a platform. It also covers the polish, performance, and security hardening needed before onboarding real churches.

---

## 8.1 — Multi-Church Architecture

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Audit all RLS policies | Verify every table's RLS policy filters by `church_id`. Run test: create 2 churches, confirm user from Church A cannot see Church B data. | Isolation confirmed |
| 2 | Church onboarding flow | `/onboard-church` — super admin creates a new church: name, country, timezone, language, welcome message, uploads logo. | Onboarding works |
| 3 | Church settings page | `/admin/settings` — edit church info, customize welcome message, set visitor SLA, upload logo, QR code download. | Settings page works |
| 4 | Custom branding per church | Church logo and primary color loaded from church record. Applied to sidebar, topbar, QR form, welcome emails. | Branding applied |
| 5 | Super admin role (platform level) | A platform-level admin (you) can see all churches. Separate from church-level `super_admin`. For support and management. | Platform admin works |
| 6 | Church isolation in storage | Storage paths prefixed with `church_id`: `profile-photos/{church_id}/{profile_id}`. Policy enforces church-scoped access. | Storage isolated |

---

## 8.2 — Performance & Reliability

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Add database indexes | Index: `church_id` on every table. `group_id` on gatherings, attendance. `profile_id` on attendance, group_members. `scheduled_at` on gatherings and events. | Indexes added |
| 2 | Optimize slow queries | Use Supabase query analyzer. Find any query >200ms. Add indexes or restructure. Target: all common queries <100ms. | Query times acceptable |
| 3 | Add loading states everywhere | Every page that fetches data needs a skeleton loader. Every button that submits needs a loading spinner. No silent wait states. | Loading states done |
| 4 | Error handling audit | Every API route returns proper error codes. Every form shows validation errors. Every failed action shows a toast. | Error handling complete |
| 5 | Pagination on all list views | Member directory, visitor queue, events list, song library — all paginated. Page size 20–50 rows. | Pagination complete |
| 6 | Rate limiting on public routes | `POST /api/visitors` and event registration — add rate limiting by IP. Prevent spam submissions. | Rate limiting active |

---

## 8.3 — Security Hardening

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Audit all public API routes | Only `POST /api/visitors` and `POST /api/events/[id]/register` should work without auth. Confirm all others require session. | Auth gates verified |
| 2 | Encrypt sensitive fields | `pastoral_notes.content` — consider pgcrypto encryption for `is_sensitive=true` notes. | Encryption in place |
| 3 | Audit log for sensitive actions | Log: role changes, pastoral note access, member deletion, church settings changes. Table: `audit_log (who, what, when, before, after)`. | Audit log works |
| 4 | Input sanitization | All text inputs sanitized server-side. No raw HTML rendered. Use DOMPurify if any rich text is rendered. | Sanitization done |
| 5 | CORS configuration | `next.config.js` CORS headers: allow only your domain + known client origins. Block unexpected origins on API. | CORS configured |
| 6 | Environment security review | Confirm `SUPABASE_SERVICE_ROLE_KEY` is never in client-side code. Confirm Twilio and Resend keys are server-only. | Secrets safe |

---

## 8.4 — UX Polish

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Mobile responsiveness audit | Test every page on 375px (iPhone SE) and 390px (iPhone 15). Fix any broken layouts. Priority: attendance page, group page, visitor form. | Mobile layout fixed |
| 2 | Arabic content audit | Ensure all Arabic name fields display correctly. RTL text in tables. Arabic date formatting. | Arabic rendering correct |
| 3 | Empty states | Every list/table needs an empty state with helpful copy + action. 'No members yet — Add your first member'. | Empty states done |
| 4 | Onboarding tooltips for new churches | First-time admin login: step-by-step tooltip overlay showing: create ministry → create group → invite members → share QR. | Onboarding tour done |
| 5 | Keyboard navigation | All modals closable with Escape. All forms submittable with Enter. Tab order correct on all forms. | Keyboard nav works |
| 6 | Toast notification system | Use shadcn/ui Sonner. Every action (save, delete, send, error) shows a toast. No silent successes or failures. | Toasts everywhere |

---

## 8.5 — Launch Prep

| # | Task | What to Build / Files to Create | Output |
|---|------|----------------------------------|--------|
| 1 | Set up production Supabase project | Separate production project from dev. Run all migrations. Set production env vars in Vercel. | Prod DB ready |
| 2 | Set up production Twilio | Register WhatsApp Business sender. Get WhatsApp template messages approved by Meta (required for business messaging). | WhatsApp approved |
| 3 | Set up production Resend | Verify domain for custom from address. Set up email templates. Test deliverability. | Email verified |
| 4 | Write church admin guide | Simple PDF or in-app guide: How to onboard, create groups, invite members, take attendance, manage visitors. | Guide ready |
| 5 | Pilot church onboarding | Onboard first real church. Sit with admin. Watch them use it. Note everything that's confusing. | First church live |
| 6 | Bug bash | Full walkthrough of every flow. Log all bugs. Fix critical ones before onboarding second church. | Known bugs documented |

---

### ✅ Phase 8 Complete When:
- [ ] Two test churches exist and their data is completely isolated from each other.
- [ ] All database queries complete under 100ms in production.
- [ ] Every list has pagination. Every action has a loading state.
- [ ] Mobile layout is usable on a 375px screen.
- [ ] WhatsApp template messages are approved by Meta.
- [ ] Production environment is fully configured.
- [ ] First real church is onboarded and using the app.

---

> 💡 These estimates assume you're using Cursor or Claude heavily for code generation. Pure manual coding would be 2–3x longer. AI tools do the heavy lifting — your job is architecture decisions, testing, and product judgment.

> ⚠️ Phase 3 (Attendance) is the make-or-break feature. If group leaders find it slow or confusing, the whole platform fails. Spend extra time here on UX. Test it with a real leader before moving to Phase 4.

---

*Ekklesia Build Phases v1.0 · Next.js · Supabase · Tailwind · shadcn/ui · Twilio · Resend · Vercel*
