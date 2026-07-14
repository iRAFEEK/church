# Ekklesia — Engineering Onboarding (read this first, in full)

Welcome to the team. This is the **one document to read before you touch anything.** It explains what we're building, how the codebase is organized, the rules that are non-negotiable, how our AI agent system works, and exactly how you'll work day to day. Read it top to bottom, follow the links as you go, and keep it open as a map.

You're not expected to memorize everything — you're expected to know **where to look** and **who to ask**. When you get stuck, run **`/ekklesia-help`** (your onboarding buddy + mentor — see the end of this doc).

> **The one rule that matters most:** you work on **staging** and the **test churches**, never on production. More on this below — but internalize it now.

---

## 0. Your first week at a glance

1. **Read this doc fully**, following the links.
2. **Set up your environment** (§6) and get all four gates green locally.
3. **Do your first task:** `docs/RAFEEK_WEEK1_TESTING.md` — click through the entire product on staging and log what you find.
4. Ask `/ekklesia-help` whenever you're unsure. Being stuck is normal and expected.

Your full 6-week program (learning + DSA + contributing + the payments capstone) lives in your intern plan — this doc is the codebase half of it.

---

## 1. What Ekklesia is (and who it serves)

Ekklesia is a **church-management platform built for Arabic-speaking churches** (primarily Egypt + diaspora). It handles members, visitors, groups/ministries, events + run-of-show, serving, Bible reading, songs/worship, announcements, prayer, outreach, notifications, a cross-church "needs" marketplace, and (currently OFF) finance. It's **live at miaekklesia.com**, pre-pilot.

- **Arabic is the primary language; the UI is right-to-left (RTL).** English is a toggle. This shapes everything — see the RTL rules in §4.
- **Target users are on budget phones and 3G.** Mobile-first, fast, small.
- Deeper: **`docs/PRODUCT_SPEC.md`** (what the product is) and **`docs/USER_GUIDE.md`** (how it's used). To *feel* it, log into the app as a pastor (§6) and click around — that beats reading about it.

---

## 2. The map: how the repo is organized

The authoritative directory map is **`CLAUDE.md` §4** — read it. The short version:

- `app/` — Next.js App Router. `(app)/` = the authenticated app, `(auth)/` = login/signup, `(public)/` = public pages (QR visitor form, church landing), `api/` = ~80 API routes by resource, `presenter/` = full-screen song/Bible projector.
- `lib/` — the backbone: `api/handler.ts` (**every route goes through this**), `api/validate.ts` (Zod), `auth.ts`, `permissions.ts`, `features.ts` (feature flags), `supabase/` (clients), `messaging/` (notifications), `schemas/` (Zod schemas).
- `components/` — React components by domain (`events/`, `songs/`, `bible/`, `ui/` shadcn primitives, …).
- `messages/` — `en.json`, `ar.json`, `ar-eg.json` — **every user-facing string lives here in all three.**
- `supabase/migrations/` — numbered SQL migrations (the DB schema's history). Current ceiling: **091** (Service Builder).
- `.claude/` — the **AI agent system** (agents, skills, scripts) — §5.
- `docs/` — the docs you're reading now.

---

## 3. Architecture & system design

Read **`docs/SYSTEM_DESIGN.md`** — it's the core technical reference, with a request-lifecycle diagram and line-cited explanations of:

- **The request lifecycle:** browser → `middleware.ts` (auth gate + feature-flag redirects + locale) → **`apiHandler`** (auth, roles, permissions, rate limiting, error handling) → Supabase query (**RLS + `church_id`**) → response.
- **Multi-tenancy:** every table has `church_id`; every query filters it; Row-Level Security enforces it in the database itself. This is how one church can never see another's data.
- **Auth, roles & permissions:** Supabase Auth (cookies), 4 roles (`super_admin`, `ministry_leader`, `group_leader`, `member`), and a 3-layer permission model.
- **The `apiHandler` contract**, Zod validation, caching (`unstable_cache` + `revalidateTag`), pagination (`.range()`).
- **i18n/RTL, feature flags, Storage (buckets), the messaging/notifications pipeline, migrations, and testing.**

Don't try to hold it all at once. Read it, then come back to the relevant section when you touch that area.

---

## 4. The rules that are law

These come from **`CLAUDE.md` §6/§7/§8/§13`** and are enforced on every change. Read those sections; here's the essence:

- **`church_id` on every query.** `.eq('church_id', churchId)` — no exceptions. Multi-tenant safety.
- **`apiHandler` on every API route.** Never write manual auth/role/rate-limit logic.
- **`t()` on every user-facing string.** Add new keys to **all three** locale files. No hardcoded English in the UI.
- **RTL logical properties, never physical.** `ms-*`/`me-*` not `ml-*`/`mr-*`; `text-start` not `text-left`; etc. (full table in `CLAUDE.md §7`). Breaking this breaks Arabic for every user.
- **Every new page gets a `loading.tsx`** skeleton (users are on 3G).
- **Every table has a mobile card fallback**; test at 390px width.
- **Zod-validate every API input.** **Never `.select('*')`** in production queries. **Always paginate** list queries.
- **Zero new `any` types. Zero TypeScript errors.**

### The gates (Definition of Done)
Before any work is "done" / any PR:
```bash
npx tsc --noEmit          # 0 errors
# RTL check (must return 0) — full command in CLAUDE.md §12
npx vitest run            # all ~1,120 tests green
npm run build             # clean
```
Plus: new strings in all 3 locale files, `church_id` on queries, `apiHandler` on routes.

---

## 5. The AI agent system (how we build here)

This repo ships with a full Claude Code **agent + skill system** in `.claude/`. You'll build features largely by **prompting these agents** — and part of your job is keeping them sharp.

**Agents** (`.claude/agents/*.md`) — specialists you invoke:
| When you want to… | Use |
|---|---|
| write code — a fix, feature, refactor | `coding-agent` |
| build a feature end-to-end (migration→route→UI→i18n→tests) | `feature-builder` |
| review changes against every standard | `code-reviewer` |
| audit for bugs / security / performance / DB / architecture | `02-quality`, `03-security`, `04-performance`, `05-database`, `01-architecture` |
| seed realistic test data | `seed-feature` |
| review/design UI | `ux-designer` |
| **get unstuck / understand something / learn** | **`Ekklesia-technical-help`** (or `/ekklesia-help`) |

**Skills** (`.claude/skills/*/SKILL.md`) — pattern libraries an agent (or you) reads *before* working. The important ones: `fix-standards` (before any change), `component-patterns` (React), `data-patterns` (API/queries), `product-domain` (the domain), `code-quality`, `optimization`, `ux-design`, `analytics`, and `context-update` (**mandatory at the end of every task**).

To go deep on how agents work in general, your intern plan links the Anthropic prompt-engineering tutorial and "Building Effective Agents." To go deep on *ours*, read the agent files themselves — they're just Markdown.

---

## 6. Your environment & workflow

Full details in **`docs/DEV_ENVIRONMENT.md`**. The essentials:

**Run the app (interns always use staging):**
```bash
npm install
npm run dev:staging      # http://localhost:3100 — points at the STAGING database
```
Log in with the seeded test pastors:
- **David's Church** — `david@miaekklesia.com` / `pastor123` (300 members, a full Sunday service run-of-show)
- **YA** (Arabic church in California) — `hoba@yachurch.test` / `pastor123` (groups, ministries, 6 events)

**Branches & deploys (this is your prod safety):**
- `main` = **production** (miaekklesia.com). **Only the lead merges to `main`.**
- `develop` = auto-deploys a **Vercel Preview** wired to **staging** data. You push here (via PRs) and get a live URL to test on.
- **Pushing a branch never reaches production** — only merging to `main` does. So you can push and live-test freely with zero prod risk.

**The loop:** branch → build (using the agents) → run the four gates → push to `develop` → check the Preview URL → open a PR → the lead reviews.

> **Golden rule, again:** staging + the David's/YA test churches only. Never run against or modify the production database.

---

## 7. What's already built, what's flagged off, what's next

- **`docs/DELIVERED.md`** — everything shipped so far, by module. Read it so you don't reinvent existing features.
- **`docs/FEATURE_FLAGS.md`** — every feature flag and its state. Note: **finance and templates are built but flagged OFF** (in-development) — don't assume they work.
- **`docs/BACKLOG.md`** — future work, with a **"Good first tasks"** list of safe, intern-friendly items. This is where you'll pull work once you're contributing (Week 2+).

---

## 8. How to get help — `/ekklesia-help`

Your mentor is one command away. **`Ekklesia-technical-help`** (invoke the agent, or type **`/ekklesia-help`**) is an onboarding buddy that knows this whole project. It will:
- answer "where is X / how does Y work / how do I do this the Ekklesia way,"
- read an error with you and explain what a failing gate is protecting,
- recommend which agent/skill to use and give you a good prompt,
- point you to the exact file + doc — and teach the *why*, not just the *what*.

It teaches first and never does your thinking for you — that's the point. Use it liberally; asking early is faster than being stuck.

Things you can ask it right now:
- "Explain how a request flows from the browser to the database in this app."
- "What's a good first task, and which agent should I use?"
- "My `npx tsc --noEmit` is failing on the events page — help me read it."
- "Walk me through adding a translated string the right way."

---

## Reading order (checklist)
- [ ] This doc (`docs/ENGINEERING_ONBOARDING.md`) — fully
- [ ] `CLAUDE.md` — §4 (map), §5 (schema), §6 (patterns), §7 (RTL/i18n), §13 (rules)
- [ ] `docs/SYSTEM_DESIGN.md`
- [ ] `docs/DEV_ENVIRONMENT.md` — then set up + get the 4 gates green
- [ ] `docs/DELIVERED.md` + `docs/FEATURE_FLAGS.md` (skim) + `docs/BACKLOG.md`
- [ ] Skim the `.claude/agents/*` roster + `.claude/skills/*`
- [ ] **First task:** `docs/RAFEEK_WEEK1_TESTING.md`
- [ ] Keep `/ekklesia-help` handy the whole time
