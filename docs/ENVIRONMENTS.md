# Ekklesia — Environments & Database Architecture

> Senior-architecture design for separating **local / staging / production**, with a real
> testing database and a safe migration-promotion workflow. Written 2026-07-10 after we hit
> the core pain: schema changes (migrations 087/088) could only be applied by hand to the
> **live** database, with no isolated place to test them.

---

## 1. Current state (the problem)

| Concern | Today | Why it hurts |
|---|---|---|
| Databases | **One** Supabase project (`hronbmjlklylupkbvgve`) serves local dev, the deployed site, and any testing | A migration or a bad query touches **production** immediately |
| Migrations | Applied **by hand** in the Supabase SQL editor ("human applies") | No review gate, no automated verification, easy to forget/misorder, no rollback story |
| Local dev | `.env.local` `DATABASE_URL` → **prod** | Running `npm run dev` reads/writes live data; e2e can't run safely |
| Testing | Unit tests (no DB) + Playwright e2e that expect seeded data | e2e has **nowhere safe** to run; not in CI |
| Vercel | Project `church`, all 3 env vars are one set | Preview deploys hit the **same** DB as Production |
| Tooling | No Supabase CLI / Docker / psql on the dev machine | Can't spin up an isolated DB; can't `supabase db push` |

The repo is **already scaffolded** for better: `supabase/config.toml` is complete (Postgres 17,
local stack ports), migrations live in `supabase/migrations/` (001–088), and CI
(`.github/workflows/ci.yml`) runs typecheck + unit tests + RTL + i18n. We just never wired the
database side of the workflow.

---

## 2. Target architecture

Three tiers, each with its **own database**, promoted left→right. Nothing reaches production
without passing through staging.

```
        LOCAL (per developer)              STAGING / PREVIEW (shared)            PRODUCTION
   ┌───────────────────────────┐      ┌──────────────────────────────┐    ┌──────────────────────┐
   │ next dev  (localhost:3000)│      │ Vercel Preview (per PR URL)  │    │ Vercel Production    │
   │ Supabase local (Docker)   │      │ Supabase STAGING project     │    │ Supabase PROD project│
   │  - full Postgres+Auth+    │      │  - schema = all migrations   │    │  = hronbmjlklylup... │
   │    Storage, reset anytime │      │  - seeded test data          │    │  - real church data  │
   │  - `supabase db reset`    │      │  - e2e + manual QA run here  │    │  - PITR backups      │
   └───────────────────────────┘      └──────────────────────────────┘    └──────────────────────┘
            │  git push branch ──────────────▶ PR ──── CI green + QA ok ──── merge to main ─────▶ deploy
            │
   migrations authored + tested here      migrations auto-applied here         migrations applied on release
```

- **Local** — isolated, disposable, offline. Where you write + first-test a migration.
- **Staging** — a permanent cloud mirror of prod's *schema* (never prod's data). Every branch/PR
  gets a Vercel **Preview** deployment wired to it. This is the **testing environment** — real
  browser QA, e2e, and migration validation, with zero risk to live data.
- **Production** — the live site. Migrations arrive only after they're proven on staging.

---

## 3. Supabase strategy — pick ONE

### Option A (recommended) — Supabase **Pro + Branching**  ·  ~$25/mo
Supabase's Git-integrated **Branching** provisions an **ephemeral database per pull request**,
automatically, seeded from your migrations. You get:
- A throwaway DB for **every** PR (perfect isolation; no shared-staging drift).
- **PITR backups** + no 7-day project pausing (free projects pause).
- Migrations applied by Supabase's own CI on branch push.

This directly solves the pain you described with the least ongoing ops. Best fit for a product
you're taking to pilot.

### Option B — Two **free** Supabase projects (staging + prod) + CLI  ·  $0
- Create `ekklesia-staging` (free tier). `ekklesia-prod` = the existing project.
- Promote with the CLI (`supabase db push`) + our CI.
- Caveats: free projects **pause after 7 days inactivity** (a cron ping or occasional use avoids
  it); no branching (one shared staging); no PITR (rely on daily logical dumps).

**Recommendation:** start on **Option A** if the ~$25/mo is acceptable — it removes an entire
class of "oops, staging drifted / who applied what" problems. Option B is a fine $0 bootstrap and
can upgrade to A later without rework (same migrations, same CLI).

---

## 4. Vercel — split environments

Vercel already has three env scopes: **Production** (main), **Preview** (all other branches/PRs),
**Development** (`vercel dev`). The fix is to **scope the Supabase vars per environment**:

| Variable | Production value | Preview value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | **staging** project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon | **staging** anon |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service role | **staging** service role |
| `DATABASE_URL` | prod pooler | **staging** pooler |
| `NEXT_PUBLIC_APP_URL` | `https://miaekklesia.com` | Vercel preview URL (auto) |
| `PLATFORM_ADMIN_EMAILS` | real owner | test owner |

Set these in **Vercel → Project → Settings → Environment Variables**, choosing the **Preview**
checkbox for staging values and **Production** for prod values. Result: **every PR gets its own
preview URL that talks to staging** — real testing, no prod exposure. (Preview deployments work on
the Hobby plan.)

---

## 5. Migration promotion workflow (the core discipline)

**Rule: nobody ever pastes SQL into the prod SQL editor again.** Migrations flow:

```
1. AUTHOR    write supabase/migrations/NNN_name.sql, locally
2. LOCAL     supabase db reset          # wipes local DB, re-applies ALL migrations + seed
             npm run dev / npm run test:e2e   # verify against local
3. PR        push branch → CI:
               - typecheck + unit tests + RTL + i18n (already exists)
               - apply migrations to STAGING (or Supabase branch)   [NEW]
               - npm run verify:schema against staging               [NEW]
               - (optional) Playwright e2e against the preview URL    [NEW]
             → Vercel Preview URL for manual QA
4. REVIEW    a human approves the PR (schema diff is in the diff)
5. MERGE     main → CI applies migrations to PROD (supabase db push --linked)  [NEW]
             → Vercel Production deploys
```

Concretely, add to `package.json`:
```jsonc
"db:reset":   "supabase db reset",                          // local: rebuild + seed
"db:diff":    "supabase db diff -f",                        // author a migration from local changes
"db:push:staging": "supabase db push --db-url $STAGING_DB_URL",
"db:push:prod":    "supabase db push --db-url $PROD_DB_URL",
"verify:schema:staging": "DATABASE_URL=$STAGING_DB_URL npm run verify:schema"
```

CI applies to staging on every PR and to prod only on merge to `main` (both gated by the existing
`verify:schema` + tests). This turns "human applies" into "reviewed + automated + verified."

**Migration hygiene going forward:**
- Keep migrations **forward-only**; for risky ones (like 088's trigger change) write the inverse
  as a comment or a paired `down` so rollback is a known quantity.
- Adopt Supabase's **timestamped** filenames for *new* migrations (`supabase migration new name`)
  to avoid the numbering collisions we've already hit (two 032s, two 033s). Existing 001–088 stay.
- Every schema change ships **with** its RLS + a `verify:schema` assertion.

---

## 6. Local development setup (one-time, per machine)

```bash
# 1. Install the CLI + Docker Desktop
brew install supabase/tap/supabase        # or: npx supabase
#   Docker Desktop: https://www.docker.com/products/docker-desktop/

# 2. From the repo (config.toml already present):
supabase start                            # boots local Postgres+Auth+Storage on 54321-54329
supabase db reset                         # applies migrations 001–088 + seeds

# 3. Point local app at the local DB (.env.local):
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<printed by `supabase start`>
SUPABASE_SERVICE_ROLE_KEY=<printed by `supabase start`>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Now `npm run dev` and `npm run test:e2e` run **fully offline against a disposable DB** — reset in
seconds, no cloud cost, no prod risk. **`.env.local` must never again point at prod.**

> No-Docker fallback: point `.env.local` at the **staging** project instead of local. Slower
> iteration, shared with others, but works without Docker.

---

## 7. Testing environment mapping

| Test type | Runs against | Where | Notes |
|---|---|---|---|
| Unit / integration (vitest, 1079) | no DB (mocked) | CI + local | already green |
| Schema verification (`verify:schema`) | staging, then prod | CI | gate before each apply |
| e2e (Playwright, `e2e/`) | local Supabase **or** staging | CI (PR) + local | env-gated already; seeded `password123` users |
| Manual QA | staging via Vercel Preview URL | browser | the "click through it" environment |

Seed determinism: keep a single idempotent seed (`supabase/seed.sql` or the `supabase/seeds/`
files) that creates the fixed test churches/users the e2e harness + manual QA expect. Local +
staging use it; **prod never does**.

---

## 8. Guardrails (prevent the accident that started this)

- **App-level:** `lib/config.ts` (already validates env via Zod) should expose `APP_ENV`
  (`local|preview|production` from `VERCEL_ENV`) so code + logs know where they are.
- **Script-level:** destructive scripts (seeds, resets) must **refuse to run** when
  `DATABASE_URL` host = the prod ref. `verify:schema` is read-only (safe); add a `assertNotProd()`
  guard to any write script.
- **Access:** only 1–2 people hold the prod service-role key; staging keys can be shared.
- **Never** commit real keys; `.env.local` is gitignored, `.env.example` documents the shape.

---

## 9. Phased rollout

**Phase 0 — unblock today's work (staging first).**  Create `ekklesia-staging` (free is fine),
apply migrations 001–088 to it (CLI or dashboard, *once*), point a local `.env.staging` / a Vercel
Preview at it → we run the onboarding-approval walkthrough (087/088) **safely, off prod**. This
alone solves the immediate blocker.

**Phase 1 — local dev.**  Install Supabase CLI + Docker; `supabase start` + `db reset`; repoint
`.env.local` to local. Full offline dev + e2e.

**Phase 2 — Vercel env split.**  Set Preview vars → staging, Production vars → prod. Preview
deployments now safe.

**Phase 3 — CI automation.**  GitHub Actions: apply migrations + `verify:schema` to staging on PR;
to prod on merge. Add e2e-against-preview.

**Phase 4 — (optional) upgrade.**  Supabase Pro Branching + PITR; retire the shared staging in
favor of per-PR branch DBs.

---

## 10. Cost summary

| Path | Supabase | Vercel | Monthly |
|---|---|---|---|
| **Bootstrap (free)** | 2 free projects (staging + prod) | Hobby | **$0** (staging pauses after 7d idle) |
| **Recommended** | Pro (branching + PITR, no pause) | Hobby → Pro if team grows | **~$25** (+$20 if Vercel Pro) |

---

## 11b. Decided (2026-07-10)

- **DB strategy:** **Option B — two free Supabase projects** (`ekklesia-staging` + existing prod).
  $0 to start; upgrade to Pro/branching later with no rework.
- **Local dev:** **Docker + Supabase CLI** (recommended) — a local disposable DB is the daily
  driver so we never lean on the pause-prone free staging for iteration. Fallback = point local at
  staging if Docker is a hassle.
- **Caveat to manage:** free staging **pauses after ~7 days idle** → add a lightweight weekly cron
  ping (or just re-open it before a QA session).

---

## 12. Phase-0 runbook — do this at the laptop (≈15 min, unblocks 087/088)

> Steps marked **[you]** need your Supabase/Vercel login or your machine; **[together]** I drive.

1. **[you] Create the staging project.** Supabase dashboard → New project → name `ekklesia-staging`
   → same region as prod (us-west-2) → save the DB password. Note the **project ref** (the
   `abcd...` in its URL).
2. **[you] Grab staging credentials** (Project Settings → API + Database): `Project URL`, `anon`
   key, `service_role` key, and the **pooler connection string** (Database → Connection string →
   "Transaction pooler", port 6543). Paste them to me privately or into `.env.staging` (gitignored).
3. **[together] Install tooling:** `brew install supabase/tap/supabase` + Docker Desktop. Then
   `supabase link --project-ref <STAGING_REF>`.
4. **[together] Apply the full schema to staging:** `supabase db push` (applies migrations
   **001–088**, including 087/088) → `npm run verify:schema:staging` to confirm a clean apply.
5. **[together] Seed staging** with the fixed test churches/users (the `password123` e2e accounts).
6. **[you] Vercel env split:** Project `church` → Settings → Environment Variables → add the
   **Preview**-scoped Supabase vars pointing at **staging** (table in §4).
7. **[together] Run the walkthrough** against staging (local `.env.staging` or the Vercel Preview
   URL): pending-church → approve, self-signup → approve, Ekklesia admin + approvers, multi-church
   switch — with screenshots + a screen recording. **Off production, finally.**

After Phase 0, Phases 1–3 (local Docker daily-driver, Vercel preview automation, CI migration
gates) are incremental and low-risk.

---

## 11. Decisions needed from you

1. **Budget:** Supabase **Pro/branching (~$25/mo, recommended)** or **free two-project** bootstrap?
2. **Local DB:** OK to install **Docker + Supabase CLI** on your machine (best dev experience), or
   should local point at the shared **staging** project instead?
3. **Who** needs prod vs. staging access (key distribution)?

Once you pick #1 and #2, Phase 0 takes ~15 minutes and we can finally run the 087/088 walkthrough
on staging instead of waiting on production.
