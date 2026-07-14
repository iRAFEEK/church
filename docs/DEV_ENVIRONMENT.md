# Ekklesia — Developer Environment & Workflow

> For someone who knows the basics (git, npm, a JS framework) and is joining Ekklesia.
> Ekklesia is a Next.js 15 + Supabase, multi-tenant, **Arabic-first (RTL)** church platform,
> live at **miaekklesia.com**. This doc gets you running and shipping safely.
>
> **The golden rule, up front:** as an intern you work **only against the staging database**
> and the seeded test churches (David's Church / YA). **Never against production data.**
> Merging to `main` is the *only* path to prod, and only the lead does that — so nothing you
> push can reach real churches.

---

## 1. One-time setup

```bash
# Clone
git clone <repo-url> church
cd church

# Install dependencies (Node 22.x — see package.json "engines")
npm install
```

You'll be given a **`.env.staging`** file out-of-band (it's gitignored — never commit it). It
holds the staging Supabase credentials. Interns generally do **not** need prod keys.

Sanity check that the toolchain works:

```bash
npx tsc --noEmit     # should print nothing / 0 errors
npx vitest run       # unit tests should pass
```

---

## 2. The two ways to run the app

### `npm run dev:staging` ← **this is what interns use**

```bash
npm run dev:staging
```

- Runs the app on **http://localhost:3100**
- Points at the **staging** Supabase database (via `scripts/dev-staging.sh` + `.env.staging`)
- Safe to click around, create data, break things — it's an isolated cloud DB seeded with test
  churches, **not** prod.
- Log in with the seeded test pastors (see §5).

There's also a `.claude/launch.json` entry named **`ekklesia-staging`** (port 3100) that runs this.

### `npm run dev` ← local, but points at PROD data — avoid as an intern

```bash
npm run dev
```

- Runs on **http://localhost:3000**
- Historically `.env.local`'s `DATABASE_URL` points at the **production** Supabase project.
  Running this reads/writes **live church data**.
- Only use this if the lead explicitly asks and you know the env is pointed somewhere safe.
  When in doubt, use `dev:staging`.

> Background: `docs/ENVIRONMENTS.md` describes the target three-tier setup (local Docker → staging
> → prod). Until local Docker is wired for you, **`npm run dev:staging` is your daily driver.**

---

## 3. Branch & deploy model

```
feature branch ──PR──▶  develop  ──(auto)──▶  Vercel Preview  ⇄  STAGING data
                                                                        │
                          lead merges ──▶  main  ──(auto)──▶  Vercel Production  ⇄  PROD data
                                                              = miaekklesia.com
```

- **`main` = production.** Auto-deploys to **miaekklesia.com** against the **prod** Supabase
  project (`hronbmjlklylupkbvgve`). **Only the lead merges to `main`.**
- **`develop`** = the integration branch. It auto-deploys a Vercel **Preview** wired to **staging**
  data — a safe, shareable URL to review work.
- **Your work:** branch off `develop` (e.g. `feat/outreach-assignments-ui`), push, then open a
  **PR into `develop`** (never into `main`).
- **Why this is safe:** pushing a feature branch or `develop` has **zero path to production**. The
  *only* way anything reaches prod is a merge into `main`, which only the lead performs. So you can
  push freely without any risk to real churches.

---

## 4. Gates that must pass before you open a PR

Run all four locally and make them clean. These mirror the project non-negotiables in
`CLAUDE.md §12–13`.

```bash
# 1. TypeScript — must be 0 errors
npx tsc --noEmit

# 2. RTL violations — must return 0
#    (Arabic is the primary language; ml-/mr-/text-left/text-right break RTL)
grep -rn "\bml-[0-9]\|\bmr-[0-9]\|\btext-right\b\|\btext-left\b" \
  app/ components/ --include="*.tsx" | grep -v "//" | wc -l

# 3. Unit tests — must pass
npx vitest run

# 4. Production build — must succeed
npm run build
```

Optional but encouraged:

```bash
npm run test:e2e          # Playwright e2e (env-gated; needs seeded staging/local DB)
npm run verify:schema     # schema sanity checks (read-only)
```

If any gate fails, fix it before requesting review. A PR with a red gate won't be merged.

---

## 5. The golden rule (repeat): staging + test churches only

- Do all manual testing on **`npm run dev:staging`** (localhost:3100).
- Log in as the seeded PROD test pastors, which also exist on staging for QA:
  - **David's Church** — `david@miaekklesia.com` / `pastor123`
  - **YA** (California) — `hoba@yachurch.test` / `pastor123`
- **Never** create, edit, or delete data on the production database. Never point your local app at
  prod. Never touch real church rows.
- Destructive scripts (seeds/resets) are guarded to refuse to run against the prod ref — don't try
  to work around that.

---

## 6. Project must-knows (skim before writing code)

`CLAUDE.md` is the source of truth. The non-negotiables that trip people up first:

- Every DB query filters by **`church_id`** (multi-tenant — never leak across churches).
- Every API route uses **`apiHandler`** (`lib/api/handler.ts`) — never hand-rolled auth.
- Every user-facing string goes through **`t('key')`** and lives in **all three** locale files
  (`messages/en.json`, `ar.json`, `ar-eg.json`).
- Every new page gets a **`loading.tsx`** skeleton.
- **RTL logical properties only** (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`, not `ml-`/`mr-`/…).
- **Finance is flagged OFF** and unreachable — don't assume it works.

Before starting a task, read the matching skill in `.claude/skills/` (see `CLAUDE.md §14`).

---

## 7. Getting unstuck

Run the **`/ekklesia-help`** mentor agent — it knows this codebase's patterns and can point you at
the right file, skill, or approach when you're blocked. And when in doubt, ask Rany.
