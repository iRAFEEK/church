# Building on Ekklesia with AI Agents — The Engineer's Guide

> A beginner-to-advanced reference for building on this platform **using AI agents**. It teaches you (1) enough about how LLMs / Claude actually work to use them well, (2) the Ekklesia agent system that lives in this repo, and (3) how to prompt it to ship real, correct, gate-passing work. Tailored to *this* codebase — the examples are real.
>
> Read `docs/ENGINEERING_ONBOARDING.md` first for the codebase itself; read this for **how we build it**. When stuck, run **`/ekklesia-help`**.

> ⚙️ **Mandatory operating protocol (every task, agents *and* chat):** use the **proper specialist agent** for the job, and **review every code change on all sides** with `code-reviewer` (plus `03-security`/`05-database` + adversarial verification for security/finance/payment changes) **before it's done**. This is not optional — it's codified in `CLAUDE.md` → "Operating Protocol". Parts 2–5 below show you how.

---

## Table of contents
- **Part 1 — Foundations (beginner):** how LLMs & Claude work, what Claude Code is, the four building blocks, why context is everything.
- **Part 2 — The Ekklesia agent system (intermediate):** the agent roster, the skills, the mentor, the rules agents enforce, the workflow.
- **Part 3 — Prompting well (intermediate→advanced):** the anatomy of a good prompt, patterns with real examples, good-vs-bad, iterating.
- **Part 4 — The golden path:** a full worked example, start to finish.
- **Part 5 — Advanced:** parallel agents, adversarial verification, context management, model selection, when *not* to use an agent, keeping the system healthy.
- **Part 6 — Reference:** cheat sheet, copy-paste templates, glossary, further learning.

---

# Part 1 — Foundations (beginner)

## 1.1 What an LLM is, in five minutes

A **Large Language Model (LLM)** like Claude is a program that predicts the next chunk of text (a **token**) given everything before it. That's the whole trick — but at scale it produces reasoning, code, and explanations. A few consequences you must internalize:

- **Tokens.** Text is split into tokens (~¾ of a word each). The model reads and writes in tokens. Cost and limits are measured in tokens.
- **The context window** is the model's short-term memory: everything it can "see" at once (your prompt + files it read + its own prior output). It is **large but finite**. Anything not in the window effectively doesn't exist for the model.
- **No persistent memory.** By default, the model remembers nothing between separate sessions. Whatever it needs to know must be *put in front of it* — that's why this repo has `CLAUDE.md`, skills, and docs. (Claude Code can persist notes to files, but the model itself is stateless.)
- **It predicts, so it can be confidently wrong ("hallucinate").** It may invent a function, a file path, or an API that looks real. **This is the single biggest risk.** The antidote is grounding: make it *read the actual code* and verify, rather than recall from memory.
- **Temperature / determinism.** LLMs are slightly random. The same prompt can give different outputs. For engineering we want it grounded and verified, not "creative."

**The one law that follows from all this:** *garbage context in → garbage out.* A model given the right files, rules, and a clear goal performs like a strong engineer. The same model given a vague prompt and no context guesses — and guesses wrong. **Most of your skill is context management, not clever wording.**

## 1.2 What Claude is (and the model family)

**Claude** is Anthropic's family of LLMs. You'll see tiers — roughly, a **most-capable** tier (best reasoning, e.g. the Opus line), a **balanced** tier (fast + strong, the Sonnet line), and a **fast/cheap** tier (the Haiku line). Rule of thumb for this repo:

- **Hard reasoning** (designing a feature, tricky debugging, security review) → the most capable model.
- **Mechanical work** (rename, move strings, small mechanical edits, bulk find-replace) → a faster/cheaper model is fine.
- When unsure, use the strong model — correctness on real church data matters more than speed.

You can pick the model in Claude Code. Newer/more-capable models make the agents in this repo behave better, because they follow the long, specific instructions in our agent files more faithfully.

## 1.3 What "Claude Code" is

**Claude Code** is the tool you're using: it wraps Claude in a **harness** that can actually *do things* — read and edit files, run shell commands (`npm run …`, `git`, tests), search the codebase, browse, and call external tools. That turns "a chatbot that writes code" into "an agent that builds, runs, and verifies code in your repo."

Key idea: the model proposes actions (tool calls); the harness executes them and feeds the results back. It loops until the task is done. So when you prompt well, you're not getting a suggestion — you're getting work that's been written, run, and checked.

## 1.4 The four building blocks (this is the mental model)

Everything in `.claude/` and the docs exists to feed the model the right context and behavior. Four pieces:

| Block | What it is | In this repo |
|---|---|---|
| **Context** | Long-lived facts always available to the model. | **`CLAUDE.md`** (the project bible) + the `docs/` guides. Loaded so the model knows our stack, rules, schema, and history. |
| **Skills** | On-demand pattern libraries the model reads *before* a certain kind of task. | `.claude/skills/*/SKILL.md` — `data-patterns`, `component-patterns`, `fix-standards`, `product-domain`, `optimization`, `ux-design`, `analytics`, `context-update`. |
| **Agents (subagents)** | Specialized personas with their own instructions, invoked for a job. | `.claude/agents/*.md` — `coding-agent`, `feature-builder`, `code-reviewer`, the auditors `00`–`07`, `ux-designer`, `seed-feature`, and your mentor `Ekklesia-technical-help`. |
| **Hooks** | Automation that fires on events (no prompting needed). | `.claude/settings.json` runs `code-review.sh` automatically when a task stops. |

There's a fifth you'll meet later: **MCP** (Model Context Protocol) — a standard way to plug external tools/servers (a browser, a database, Slack…) into the agent. You don't need it to start.

**How they combine:** you invoke an **agent**, which is told to read the relevant **skills** and the **context** (`CLAUDE.md`), does the work in the repo, and a **hook** may auto-review it afterward. Your job is to point the right agent at a well-scoped task.

## 1.5 Why context is everything (say it again)

The reason this repo has a `CLAUDE.md`, ten skills, an agent roster, and a `docs/` folder is **not** bureaucracy — it's because the model only knows what's in front of it. A prompt like *"add a members export button"* with no context makes the model guess our auth, our i18n, our RTL rules, our multi-tenancy. A prompt that says *"read `.claude/skills/data-patterns/SKILL.md`, then add … following our `apiHandler` + `church_id` + `t()` patterns"* makes it build the way we build. Feeding context is the whole game.

---

# Part 2 — The Ekklesia agent system (intermediate)

## 2.1 The agent roster — what to reach for

Each agent is a Markdown file in `.claude/agents/`. Every one now begins with a **guardrail block** (read `CLAUDE.md` + onboarding first, the Definition-of-Done gates, the *staging-only, never-prod* rule, and a "how to prompt me" example). Pick by intent:

| I want to… | Use | It reads | Starter prompt |
|---|---|---|---|
| Fix a bug / small change / refactor | **`coding-agent`** | fix-standards, component/data patterns | "Fix the untranslated 'Save' button on the visitors page — add the key to all 3 locale files, run the gates." |
| Build a feature end-to-end | **`feature-builder`** | all build skills; coordinates auditors | "Build a 'member birthday reminder' feature: migration + RLS + apiHandler route + component + i18n + tests." |
| Review my changes before a PR | **`code-reviewer`** | every project standard | "Review my uncommitted changes." (or `bash .claude/scripts/code-review.sh`) |
| Find security holes | **`03-security`** | security patterns | "Audit `app/api/events/` for IDOR and missing `church_id` filters." |
| Find slow queries / perf issues | **`04-performance`** | optimization | "Find N+1 queries and missing caching in the dashboard." |
| Check DB/RLS/indexes/migrations | **`05-database`** | DB patterns | "Review migration 09x for RLS gaps and missing indexes." |
| Find bugs / null-safety / `any` | **`02-quality`** | code quality | "Audit `components/events/` for null-safety and `any` types." |
| Understand structure/patterns | **`01-architecture`** | architecture | "Map how events + segments flow from API to UI." |
| Deep code archaeology | **`00-archaeologist`** | — | "Trace everywhere `church_id` is resolved." |
| A full multi-specialist audit | **`07-cto`** (orchestrator) | all auditors | "Run a full audit and give me a prioritized plan." |
| Review/design UI | **`ux-designer`** | ux-design | "Review the run-of-show editor for mobile Arabic UX." |
| Seed realistic test data | **`seed-feature`** | — (executes SQL — staging only!) | "Seed 20 members + 2 groups into the staging test church." |
| Optimize what I just built | **`optimize-after-feature`** | optimization | "Optimize the files I changed in my last commit." |
| **Get unstuck / learn / understand** | **`Ekklesia-technical-help`** (`/ekklesia-help`) | all docs | "Explain how a request flows from browser to DB here." |

The auditors (`00`–`07`, `code-reviewer`) are **read-only** — they report, they don't change code. The builders (`coding-agent`, `feature-builder`, `optimize-after-feature`, `seed-feature`) write code and must pass the gates.

## 2.2 The skills — read the right one first

Skills are `.claude/skills/*/SKILL.md`. A good prompt tells the agent which to read (or the agent's own instructions do). The map:

| Task | Skill |
|---|---|
| Any fix/refactor | `fix-standards` |
| A React component | `component-patterns` |
| An API route / query / DB work | `data-patterns` |
| Understanding the domain | `product-domain` |
| Performance work | `optimization` |
| UI/UX work | `ux-design` |
| Instrumenting a feature | `analytics` |
| **After any task (mandatory)** | `context-update` — updates `CLAUDE.md` so the next session knows what you did |

## 2.3 The mentor — `/ekklesia-help`

`Ekklesia-technical-help` is your onboarding buddy. It answers "where is X / how does Y work / which agent should I use / help me read this error," **teaches the why**, and always points to the exact file + doc. It never touches production and enforces the rules. Use it constantly — asking early beats being stuck.

## 2.4 The non-negotiables every agent enforces

These come from `CLAUDE.md §13`. The agents know them; you should too, so you can spot when something's off:

- **`.eq('church_id', churchId)` on every query** (multi-tenant safety).
- **`apiHandler` on every API route** (never manual auth).
- **`t()` on every user-facing string**, added to all three locale files (`messages/en|ar|ar-eg.json`).
- **RTL logical properties** (`ms-*` not `ml-*`, `text-start` not `text-left`).
- **`loading.tsx` on every new page**; **mobile card fallback** for every table.
- **Zod-validate inputs; never `.select('*')`; always paginate.**
- **Zero new `any`; zero TypeScript errors.**

### The gates (Definition of Done)
Nothing is "done" until:
```bash
npx tsc --noEmit     # 0 errors
# RTL grep (CLAUDE.md §12) must return 0
npx vitest run       # ~1,120 tests, all green
npm run build        # clean
```

## 2.5 The workflow (where agent work lands)
`main` = production (only the lead merges). `develop` = auto-deploys a **Vercel Preview on staging data**. You: branch → build with the agents → run the four gates → push to `develop` → check the Preview URL → open a PR. Pushing a branch has **zero path to prod**. Everything runs against **staging + the test churches** ("David's Church" `david@miaekklesia.com`/`pastor123`, "YA" `hoba@yachurch.test`/`pastor123`) — never prod data. (Full detail: `docs/DEV_ENVIRONMENT.md`.)

---

# Part 3 — Prompting well (intermediate → advanced)

## 3.1 The anatomy of a great prompt (for this repo)

A strong prompt has five parts. Miss one and quality drops:

1. **Goal** — what outcome, in one sentence. ("Add an 'archived' status to announcements.")
2. **Scope** — which files/areas; what NOT to touch. ("Only `app/api/announcements/` + `components/announcements/`. Don't touch the schema of other tables.")
3. **Constraints (context)** — the rules + what to read. ("Follow our `apiHandler` + Zod + `church_id` patterns; read `.claude/skills/data-patterns/SKILL.md`. Arabic-first, RTL, i18n in all 3 locales.")
4. **Definition of done** — the gates + tests. ("tsc 0, RTL 0, vitest green, build clean; add a test for the new status filter.")
5. **Verification** — how to prove it works. ("Verify on staging in David's Church; show the archived filter working.")

You don't have to write all five every time — the *agents already carry the constraints and gates*. But the more of 1–2 you give (clear goal + tight scope), the better the result. The failure mode is always **too vague**, never too specific.

## 3.2 Prompt patterns with real examples

**Fix a bug**
> "On the event detail page, the run-of-show 'Present' link for a Bible segment is missing the verse. It should open `/presenter/bible/[bibleId]/[chapterId]?verse=N`. Fix it in `components/events/EventRunOfShow.tsx`, keep it read-only, run the gates."

**Add a small feature** (coding-agent)
> "Add a 'pinned' toggle to announcements. Reuse the existing `announcements` table's `is_pinned` column. Update the admin list + the member view to show pinned items first. `apiHandler` + Zod, i18n in all 3 locales, add a test. Only touch `app/api/announcements/*` and `components/announcements/*`."

**Build a feature end-to-end** (feature-builder)
> "Build 'member birthday reminders': a nightly cron that notifies group leaders of members with a birthday this week. Needs a migration (add `profiles.birthday` if missing + an index), RLS, an `apiHandler` cron route (secured with `CRON_SECRET`), the notification trigger via `lib/messaging/`, i18n, and tests. Gate it behind a feature flag. Verify on staging."

**Audit before you trust the code** (security)
> "Adversarially audit `app/api/community/` for cross-church data leaks and PII exposure. Report findings as SEC-N with file:line and a concrete exploit scenario. Read-only."

**Review changes** (code-reviewer)
> "Review my uncommitted diff against every Ekklesia standard — security, `church_id`, apiHandler, RTL, i18n, mobile, tests. List issues by severity."

**Seed test data** (seed-feature — staging only)
> "Into the staging 'David's Church', seed 15 realistic Arabic-named members and one small group with 8 of them. Idempotent SQL. Never touch prod."

**Ask the mentor** (/ekklesia-help)
> "I don't understand how permissions get resolved. Walk me through it with the real files, then quiz me."

## 3.3 Good vs. bad prompt

❌ **Bad:** "make a payments page"
- No scope, no provider, no rules, no done-definition. The agent will guess your stack, invent an API, and skip i18n/RTL/tests.

✅ **Good:** "Scaffold a *staging-only, flag-gated* donation checkout for the Egyptian gateway we choose later. For now: an `apiHandler` route `POST /api/payments/checkout` that validates input with Zod and returns a stubbed redirect URL; a webhook route skeleton with signature-verification TODO (mirror the security pattern in `app/api/auth/sms-hook/route.ts`); no real keys. i18n in all 3 locales, tests for the route, gates green. Only touch `app/api/payments/` + a new `lib/payments/`."

The difference is entirely **scope + constraints + grounding** (pointing at a real file to mirror).

## 3.4 Three habits that prevent 90% of bad output

1. **"Read X first."** Point the agent at the real file/skill to mirror, so it grounds instead of hallucinating. ("Mirror `app/api/events/[id]/segments/route.ts`.")
2. **Lock the scope.** Name the files it may touch and the ones it must not. This prevents sprawling diffs and collisions.
3. **Demand verification.** "Run the gates and show me they pass" / "verify on staging." Never accept "done" without proof — the model can believe it's finished when it isn't.

## 3.5 When the agent gets it wrong

It will, sometimes. Don't re-type the whole thing — **correct the specific thing**:
- It hallucinated a function → "That helper doesn't exist. Grep for the real one and use it."
- It broke a gate → paste the tsc/RTL/test error and say "fix this, then re-run the gates."
- It went out of scope → "Revert the changes to `X`; only touch `Y`."
- It over-built → "Too much. Do the smallest version that passes the test."

Iterating with precise corrections is normal and fast. Treat the agent like a strong junior who needs sharp feedback.

---

# Part 4 — The golden path (a full worked example)

**Task:** add a "notes" field to a visitor so leaders can jot context.

1. **Understand first (mentor):** `/ekklesia-help` → "Where does visitor data live — table, API, UI?" It points you to the `visitors` table (`CLAUDE.md §5`), `app/api/visitors/`, `components/visitors/`.
2. **Branch:** `git checkout -b feature/visitor-notes` off `develop`.
3. **Build (coding-agent):**
   > "Add an optional `notes` (text) field to visitors. Migration to add the column + it's already church-scoped via the table. Update the visitor detail API (`app/api/visitors/[id]/route.ts`) to read/write it with Zod validation, and the visitor detail UI (`components/visitors/…`) with a textarea (RTL, `dir=auto`, `t()` in all 3 locales, 44px touch targets). Add a test for the update route. Only touch visitors files + the new migration. Run the gates."
4. **Review (code-reviewer):** "Review this diff against our standards." Fix anything it flags.
5. **Gates:** `npx tsc --noEmit` · RTL grep · `npx vitest run` · `npm run build` — all green.
6. **Push + preview:** push the branch / into `develop` → open the **Preview URL** → log in to David's Church on staging → add a note to a visitor → confirm it saves and re-loads.
7. **Migration to prod** happens later, with the lead's explicit sign-off (never by you, never automatically).
8. **PR** into `develop`; the lead reviews and merges to `main` when ready.
9. **Close the loop (context-update):** the `context-update` skill updates `CLAUDE.md`'s change log so the next session knows this shipped.

That's the whole rhythm: **understand → branch → build with an agent → review → gates → preview → PR → update context.**

---

# Part 5 — Advanced techniques

## 5.1 Parallel agents (fan-out)
For big, independent work you can run several agents at once — e.g. one writing each of several docs, or one auditor per dimension (security / performance / DB) in parallel. The rule: **give each a non-overlapping file scope** so they don't collide, then reconcile the results. This is how large sweeps get done fast. (This very repo's onboarding docs were built by parallel agents.)

## 5.2 Adversarial verification (trust, then verify)
LLMs can produce plausible-but-wrong findings and plausible-but-wrong code. For anything that matters (security, money, auth), **verify with a second, skeptical pass**: after an agent claims a bug or a fix, have `code-reviewer` or a security auditor try to *refute* it. Majority-skeptic beats single-optimist. Never ship a security/finance change on one agent's word.

## 5.3 Managing the context window
The model degrades if you stuff its window with noise. Keep prompts **tight and pointed**: reference files by path instead of pasting them, tell the agent which skill to read rather than re-explaining patterns, and split huge tasks into scoped steps. A focused 200-word prompt that names three files beats a 2,000-word essay.

## 5.4 Model selection & reasoning effort
Match the tier to the task (§1.2). Use the most capable model for design, tricky bugs, security, and anything with real church data at stake; a faster model for mechanical edits. When a task is hard and the stakes are high, spend the tokens — correctness is cheaper than a production incident.

## 5.5 When NOT to use an agent
- **Trivial edits** you can do in ten seconds — just do them.
- **Anything touching production** — that's a human decision with explicit sign-off (prod migrations, key rotation, merges to `main`).
- **Product/judgment calls** — what to build, pricing, church-facing wording in Arabic nuance — the agent drafts, a human decides.
- **When you don't understand the output** — never merge code you can't explain. Ask `/ekklesia-help` to walk you through it first.

## 5.6 Keeping the system healthy
Agents are only as good as the context you feed them. **The context drifts** — features ship, patterns change, and skills/CLAUDE.md fall behind (we found the agents claiming "zero tests" when there were 1,120). So:
- Run the **`context-update`** skill at the end of every task — it's mandatory.
- When you introduce a new pattern, update the relevant **skill** so future agents follow it.
- Periodically re-read an agent file and fix stale instructions. A sharp agent system is a maintained one.

---

# Part 6 — Reference

## 6.1 Agent cheat sheet
```
coding-agent            → fixes & small features (writes code)
feature-builder         → full features end-to-end (writes code)
code-reviewer           → review my diff (read-only)
02-quality              → bugs, null-safety, any-types (read-only)
03-security             → IDOR, PII, church_id leaks (read-only)
04-performance          → N+1, caching, 3G (read-only)
05-database             → RLS, indexes, migrations (read-only)
01-architecture         → structure & patterns (read-only)
00-archaeologist        → deep code tracing (read-only)
07-cto                  → orchestrate a full audit (read-only)
ux-designer             → UI review / design specs
seed-feature            → seed staging test data (writes SQL — staging only)
optimize-after-feature  → optimize recently changed files
Ekklesia-technical-help → mentor / get unstuck (/ekklesia-help)
```

## 6.2 Copy-paste prompt templates

**Feature / fix:**
```
Goal: <one sentence>.
Scope: only touch <files>; do NOT touch <files>.
Constraints: follow our apiHandler + Zod + church_id patterns; read
  .claude/skills/<skill>/SKILL.md; Arabic-first, RTL, i18n in all 3 locales.
Done: tsc 0, RTL grep 0, vitest green, build clean; add a test for <behavior>.
Verify: on staging in David's Church, show <observable result>.
```

**Audit:**
```
Adversarially audit <path> for <risk>. Report findings as <TAG>-N with
file:line and a concrete failure/exploit scenario. Read-only, don't fix.
```

## 6.3 Glossary
- **Token** — the ~¾-word unit models read/write in.
- **Context window** — the model's finite short-term memory (prompt + files + output).
- **Hallucination** — a confident, wrong invention (fake API/file). Grounding in real code prevents it.
- **Temperature** — the model's randomness knob; identical prompts can differ.
- **Agent / subagent** — a persona with its own instructions, invoked for a job (`.claude/agents/*`).
- **Skill** — an on-demand pattern library the model reads before a task (`.claude/skills/*`).
- **Hook** — automation that fires on an event (`.claude/settings.json`).
- **MCP (Model Context Protocol)** — a standard for plugging external tools/servers into the agent.
- **RLS (Row-Level Security)** — Postgres rules that stop one church reading another's rows.
- **Idempotent** — safe to run twice with the same result (critical for webhooks/payments).
- **Gate** — a check that must pass before "done" (tsc, RTL, tests, build).

## 6.4 Further learning
- **How Claude Code works:** https://docs.claude.com/en/docs/claude-code
- **Prompt engineering (interactive tutorial):** https://github.com/anthropics/courses
- **Building effective agents (Anthropic):** https://www.anthropic.com/engineering/building-effective-agents
- **Prompt engineering docs:** https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview
- **Our own system:** every `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` is readable Markdown — read the agent you're about to use.

---

> **The one-line summary:** feed the right agent the right context and a tightly-scoped goal, make it read real code instead of guessing, and never accept "done" without passing the gates and verifying on staging. Do that and you'll ship like a senior on day one.
