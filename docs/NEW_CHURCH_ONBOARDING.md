# New-Church Onboarding — Operator Runbook

> One page to take a pilot church from "interested" to "running their first event."
> Audience: **you** (the platform operator) + the church's **pastor/admin**.
> Last updated: 2026-07-09.

Ekklesia uses a **concierge** onboarding model: a church requests access, you approve it,
and the pastor becomes the first `super_admin`. Members then come in through two doors
(leader-adds-them, or they self-sign-up) and converge on one active membership.

---

## Step 1 — The church requests access  *(pastor)*

The pastor goes to **`/welcome`** → **`/welcome/register`** and completes the registration
wizard (church name EN/AR, denomination, contact name + phone, and their admin account).

- This creates a **pending** church (`churches.status='pending'`, `is_active=false`).
- Pending churches are **hidden from search** and can't be joined yet.
- The pastor lands on **`/pending-church`** — a warm "under review" screen. They can't
  reach the app until you approve.

## Step 2 — You approve the church  *(platform operator)*

Sign in with the account listed in **`PLATFORM_ADMIN_EMAILS`** (currently
`ranytenma@gmail.com`) and open **`/platform/churches`**.

- You'll see every pending church with its contact name + phone. **Verify the requester**
  (a quick WhatsApp/call — this is the concierge gate).
- **Approve** → church flips to `active` + `is_active=true`; the pastor now has full access
  on their next load. **Reject** → `status='rejected'` (row kept for audit; pastor stays on
  the pending screen).

## Step 3 — Pastor's first login + onboarding  *(pastor)*

The pastor signs in (email/password, or WhatsApp OTP once that's live) → completes the
short **`/onboarding`** flow → lands on the **admin dashboard** as `super_admin`.

At this point they can use every core module: members, groups, ministries, events,
visitors, serving, announcements, prayer, Bible, songs. *(Finance is intentionally OFF.)*

## Step 4 — Add members  *(pastor / ministry leader)*

Two doors, one lifecycle:

**Door A — leader adds them** (fastest for a known congregation): **`/admin/members`** →
**Add member** → name + optional phone.
- With a phone → a **claimable shadow identity** is created (`user_churches.status='managed'`,
  shows a *"Pending claim"* badge). The person later signs in with **WhatsApp OTP on that
  phone** and is instantly activated — a pre-added phone = pre-approval, no queue.
- No phone (kids, elderly) → a leader-managed record that never needs to log in.

**Door B — they self-sign-up**: the member creates an account and requests to join the
church → it lands in the approval queue at **`/admin/join-requests`** → super_admin or
ministry_leader **approves** → active membership granted.

> Rule of thumb: pre-added phone → auto-claims silently; unknown person → approval queue.

## Step 5 — Set roles & permissions  *(super_admin)*

- Per-member role: **`/admin/members/[id]`** → change role (`member` /
  `group_leader` / `ministry_leader` / `super_admin`).
- Fine-grained per-user overrides: **`/admin/permissions/[userId]`**.
- Church-wide role defaults: **`/admin/settings/roles`**.
- Phone-directory privacy (who sees member phone numbers): **`/admin/settings/privacy`**
  (default `leaders_only`).

## Step 6 — Create the first event  *(admin / ministry leader)*

**`/admin/events/new`** (or **`/admin/events/from-template`**) → set title, type, date →
optionally add service segments + volunteer needs → **publish**. Members see it under
**`/events`** and can RSVP.

That's a live church. 🎉

---

## Quick reference

| Action | Who | Where |
|---|---|---|
| Request a church | Pastor | `/welcome/register` |
| "Under review" screen | Pastor | `/pending-church` |
| Approve/reject churches | Platform operator | `/platform/churches` |
| Complete onboarding | Pastor | `/onboarding` |
| Add a member | Admin / ministry leader | `/admin/members` → Add member |
| Approve self-signups | Admin / ministry leader | `/admin/join-requests` |
| Claim a pre-added account | Member | Login → **Phone** tab → WhatsApp OTP |
| Change a member's role | super_admin | `/admin/members/[id]` |
| Directory phone privacy | super_admin | `/admin/settings/privacy` |
| Create first event | Admin / ministry leader | `/admin/events/new` |

## Troubleshooting

- **Pastor stuck on `/pending-church`** → the church is still `pending`; approve it at
  `/platform/churches`. If you can't see `/platform/churches`, your login isn't in
  `PLATFORM_ADMIN_EMAILS`.
- **Approved admin gets 403 on admin pages** → their `user_churches.role` didn't sync;
  this is auto-corrected by the sync trigger (migration 076). Confirm migrations are
  applied in prod (`npm run verify:schema`).
- **WhatsApp OTP code never arrives** → the Arabic (`ar`) template must be approved in
  Meta and the Supabase phone provider + Send-SMS hook configured. See
  [WHATSAPP_OTP_SETUP.md](WHATSAPP_OTP_SETUP.md).
- **Forgot-password email never arrives** → add `/reset-password` to Supabase Auth
  redirect URLs and configure SMTP. See [../LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md).
- **Member self-signup can't find the church** → it's still `pending` (hidden from search)
  or `is_active=false`. Approve it first.
