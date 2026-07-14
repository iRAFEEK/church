# Rafeek — Week 1 Task: Test the Entire Product

> Your first job: **click through every feature of Ekklesia on staging and find what's broken.**
> You don't need to write code yet — you need to *use* the app like a real church pastor would,
> note what works, and flag anything confusing, broken, or wrong (especially in Arabic/RTL).
>
> This is genuinely valuable: fresh eyes catch bugs the team has gone blind to. Take your time,
> be thorough, and write down everything.

---

## Before you start

1. Run the app against **staging** (never prod):
   ```bash
   npm run dev:staging
   ```
   Open **http://localhost:3100**.

2. Log in as the seeded test pastors (super_admin of their church):
   - **David's Church** — `david@miaekklesia.com` / `pastor123`
   - **YA** (California) — `hoba@yachurch.test` / `pastor123`

3. **Test in both languages.** The app defaults to **Arabic (RTL)**; toggle to English and back.
   For every screen, glance at the Arabic view and check nothing is mirrored wrong, clipped, or
   still showing English/`raw.key.text`.

4. **Test on a narrow window too.** Resize your browser to ~390px wide (or use device toolbar) —
   this app is mobile-first for budget phones. Note anything that overflows or is too small to tap.

5. **When you get stuck or unsure what "correct" looks like:** run **`/ekklesia-help`** (the mentor
   agent) or ask Rany.

**How to use the checklist:** for each item, do the click, compare to the expected result, and mark
the box. If anything is off, write it in the `notes/bug?` line. Empty = you haven't tested it yet.

---

## 1. Auth & Onboarding

- [ ] **Log in (email/password)** → lands on the dashboard for your church.
  notes/bug?:
- [ ] **Log out** (More / menu → Sign Out) → returns to `/login`.
  notes/bug?:
- [ ] **Forgot password** → `/forgot-password`, submit an email → see a neutral "if the account
  exists, we sent a link" message (no account enumeration).
  notes/bug?:
- [ ] **Self-signup** (`/signup`) with a new email → creates a **pending** membership; you should
  land on the "membership pending / under review" screen, NOT full app access.
  notes/bug?:
- [ ] **Church search on the logged-out signup page** returns active churches (David's / YA appear).
  notes/bug?:
- [ ] **Onboarding flow** for a fresh member → profile step pre-fills any known name, completes,
  lands in the app.
  notes/bug?:
- [ ] **Arabic/RTL pass** on login + signup — layout correct, no clipped text.
  notes/bug?:

---

## 2. Members

- [ ] **Member directory** (`/admin/members`) → paginated list (25/page), search works.
  notes/bug?:
- [ ] **Phone visibility** — as super_admin you can see phone numbers; note whether the
  privacy setting (leaders_only default) behaves as expected.
  notes/bug?:
- [ ] **Add member** → dialog collects name (+ optional phone), creates a "pending claim" member.
  notes/bug?:
- [ ] **Member detail** page → Info tab, milestones, involvement, attendance history all render.
  notes/bug?:
- [ ] **At-risk view** → surfaces members flagged by absence logic without errors.
  notes/bug?:
- [ ] **Mobile card view** — directory falls back to cards on narrow screens (not a cut-off table).
  notes/bug?:

---

## 3. Visitors

- [ ] **Visitor queue** (`/admin/visitors`) → shows visitors by status (new/assigned/contacted/…).
  notes/bug?:
- [ ] **Public QR intake** (`/join`) — open it logged-out, fill the form, submit → success page,
  and the new visitor appears in the queue. **Try submitting with optional fields blank** (this
  has bitten us before — it must not reject empty email/age/how-heard).
  notes/bug?:
- [ ] **Assign a visitor** to a leader → status flips to assigned.
  notes/bug?:
- [ ] **Follow-up / escalation** — log a contact / see SLA behavior.
  notes/bug?:

---

## 4. Groups

- [ ] **Groups list** (`/admin/groups`) → renders, create a new group.
  notes/bug?:
- [ ] **Group detail** → members, meeting day/time show.
  notes/bug?:
- [ ] **New gathering** for a group → create one with a topic/date.
  notes/bug?:
- [ ] **Attendance** — mark present/absent/excused/late (try the swipe attendance UI on mobile).
  notes/bug?:
- [ ] **Group join request** — as a member, request to join a group → leader sees it and can
  approve/decline.
  notes/bug?:

---

## 5. Ministries

- [ ] **Ministries list** (`/admin/ministries`) → renders, create a ministry, add members.
  notes/bug?:
- [ ] **Ministry meetings** — schedule a meeting, add notes.
  notes/bug?:
- [ ] **Action items / tasks** — add a task (standalone or meeting-linked), assign to a member.
  notes/bug?:

---

## 6. Events

- [ ] **Events list** (`/events` member view + `/admin/events`) → upcoming events render.
  notes/bug?:
- [ ] **Create an event** → title (EN+AR), start/end, type; it appears in the list.
  notes/bug?:
- [ ] **RSVP** to an event as a member → registration recorded.
  notes/bug?:
- [ ] **Service Builder / run-of-show** — open an event's service plan and add segments:
  - [ ] Add a **Song** segment (pick from the hymnal) → shows in the run-of-show.
    notes/bug?:
  - [ ] Add a **Bible** segment (pick a passage) → shows in the run-of-show.
    notes/bug?:
  - [ ] Add a **File** segment (upload a PDF/slide) → uploads and shows.
    notes/bug?:
  - [ ] **Present** a segment → song opens `/presenter/songs`, Bible opens `/presenter/bible`,
    file opens the uploaded doc full-screen.
    notes/bug?:
- [ ] **Service planning / needs** — add a service need (volunteers needed) + assign volunteers.
  notes/bug?:
- [ ] **Templates** — note: event templates are **flagged OFF / in-dev**; just confirm they're not
  reachable or clearly disabled, don't deep-test.
  notes/bug?:

---

## 7. Serving

- [ ] **Serving areas** (`/admin/serving`) → create an area, add a slot with a date + max volunteers.
  notes/bug?:
- [ ] **Member serving signup** (`/serving`) → sign up for a slot → count updates, can withdraw.
  notes/bug?:

---

## 8. Songs

- [ ] **Song list / search** (`/admin/songs`) → search the shared hymnal (~11k songs). Try Arabic
  queries like `يا رب`; try a hamza-less query — results should still return.
  notes/bug?:
- [ ] **Song detail** shows lyrics (Arabic lyrics should display even in the English UI).
  notes/bug?:
- [ ] **Presenter** — open a song in `/presenter/songs` → full-screen, readable.
  notes/bug?:
- [ ] **Add to service** — from a song, "Add to service" attaches it to an event's run-of-show.
  notes/bug?:

---

## 9. Bible

- [ ] **Reader** (`/bible`) → pick a book/chapter, text renders in Arabic.
  notes/bug?:
- [ ] **Search** the Bible → returns matching verses.
  notes/bug?:
- [ ] **Bookmarks / highlights** → add one, it persists on reload.
  notes/bug?:
- [ ] **Presenter** — open a passage in `/presenter/bible` → full-screen.
  notes/bug?:
- [ ] **Add to service** — from a passage, add it to an event's run-of-show.
  notes/bug?:

---

## 10. Announcements

- [ ] **Admin announcements** (`/admin/announcements`) → create a draft, publish it, pin it.
  notes/bug?:
- [ ] **Member-facing announcements** (`/announcements`) → published + pinned ones show correctly.
  notes/bug?:

---

## 11. Prayer

- [ ] **Submit a prayer request** — as a member, use the **"I have a prayer request"** button
  (`/prayer`) → it's recorded; try a private one.
  notes/bug?:
- [ ] **Admin prayers** (`/admin/prayers`) → see requests, assign one to a member.
  notes/bug?:
- [ ] **"I'm praying" response** — tap it on a request → count/feedback updates.
  notes/bug?:

---

## 12. Outreach

- [ ] **Outreach dashboard** (`/admin/outreach`) → renders.
  notes/bug?:
- [ ] **Assign a visit** — assign a member/family to an outreach leader.
  notes/bug?:
- [ ] **Log a visit** — record a home/hospital visit with notes → appears in visit history.
  notes/bug?:

---

## 13. Notifications

- [ ] **Notification composer** (admin) → compose + send a notification to an audience.
  notes/bug?:
- [ ] **Notification bell** → the sent notification appears; mark read; unread count updates.
  notes/bug?:
- [ ] **Notification center** (`/notifications`) → list renders, types show human labels (not raw
  keys).
  notes/bug?:

---

## 14. Community Needs (cross-church)

- [ ] **Browse needs** (`/community/needs`) → needs from other churches show.
  notes/bug?:
- [ ] **Post a need** for your church → appears under "Your Needs."
  notes/bug?:
- [ ] **Respond to another church's need** → response recorded; try responding twice (should dedupe
  / 409, not double-post).
  notes/bug?:
- [ ] **Message thread** on an accepted response → send a message, other side can read it.
  notes/bug?:

---

## 15. Liturgy (Coptic)

- [ ] **Liturgy section** (`/liturgy`) → Agpeya hours, psalmody, lectionary readings render.
  notes/bug?:
- [ ] **Clergy-only resources** — confirm they're gated (a plain member shouldn't see them).
  notes/bug?:

---

## 16. Admin & Settings

- [ ] **Role permissions** (`/admin/settings/roles`) → adjust a role default; confirm it's
  super_admin-only (a non-admin can't load it).
  notes/bug?:
- [ ] **Per-user permissions** (`/admin/permissions/[userId]`) → toggle an override.
  notes/bug?:
- [ ] **Directory privacy** (`/admin/settings/privacy`) → change who can see member phone numbers;
  confirm the directory respects it.
  notes/bug?:
- [ ] **Notification channel settings** (`/admin/settings/notifications`) → toggle the WhatsApp
  opt-in (push + in-app noted as always-free).
  notes/bug?:
- [ ] **Church QR code** (`/admin/settings`) → the join QR generates and points at `/join`.
  notes/bug?:

---

## 17. Platform-admin / approval flow

> Requires being on the `PLATFORM_ADMIN_EMAILS` allowlist (ask Rany which staging account works).

- [ ] **Platform hub** (`/platform`) → pending-church queue renders.
  notes/bug?:
- [ ] **Approve a pending church** → its status flips to active and it becomes searchable.
  notes/bug?:
- [ ] **Approvers panel** — add/remove an approver email (owner/last-admin guard should block
  removing the last one).
  notes/bug?:
- [ ] **Member approval queue** (`/admin/join-requests`) → a pending self-signup shows; approve it →
  that member gets full access.
  notes/bug?:

---

## 18. Multi-church switching

- [ ] **Join another church** — from the church switcher, request to join a second church → request
  is created.
  notes/bug?:
- [ ] **Switch churches** — once you belong to two, switch between them → the whole app rescopes to
  the selected church (data changes, no leakage from the other).
  notes/bug?:
- [ ] **Login lands in last church** — log out and back in → you land in the church you last used.
  notes/bug?:

---

## How to file what you find

Keep it simple. Maintain **one running list** (a shared doc / spreadsheet / message thread with
Rany) and add a row every time something is off. For each finding, capture:

1. **Where** — the module + URL (e.g. "Visitors — `/join`").
2. **What you did** — the exact clicks.
3. **What happened** vs. **what you expected.**
4. **Language / screen size** — Arabic or English? Desktop or ~390px mobile?
5. **Severity (your gut)** — 🔴 blocks the flow · 🟠 wrong but usable · 🟡 cosmetic/confusing.
6. **Screenshot** if you can (especially for RTL/layout bugs).

Group them by module so Rany can triage fast. Don't try to fix anything yet — your job this week is
to **find and clearly describe.** When you're unsure whether something is a bug or intended, note it
as a question and run **`/ekklesia-help`** or ask Rany.
