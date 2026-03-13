# Skill: Context Update — Ekklesia Agent Coordination Protocol

**Every agent that touches the codebase MUST follow this protocol.**
This is how we prevent merge conflicts between parallel agents.
This is how we prevent agents from re-doing work already done.
This is how we keep the codebase coherent with multiple agents running.

---

## THE THREE LAWS

**1. CLAIM before you code.**
Before modifying any file, claim it in `LIVE-CONTEXT.md` → Active Work table.

**2. READ before you claim.**
Before claiming anything, read ALL of LIVE-CONTEXT.md — especially Active Work and Completed PRs.
If the file you need is already claimed, either wait or read the existing work and build on it.

**3. WRITE when you're done.**
When your work is complete, write a PR block to LIVE-CONTEXT.md using the exact format below.
Then release your claim in the Active Work table.

Violating any of these three laws causes merge conflicts and duplicate work.

---

## Step 0 — Read LIVE-CONTEXT.md completely (every time, no exceptions)

```bash
cat LIVE-CONTEXT.md
```

Read:
- **Active Work table** — files claimed by other agents right now
- **Completed PRs** — what has already been changed (don't redo it)
- **File Ownership Map** — who last touched each file
- **Blockers** — things you may depend on that aren't done yet
- **Decisions Log** — don't re-litigate settled decisions

If you skip this step, you will conflict with other agents.

---

## Step 1 — Claim your files

Before writing a single line of code, claim every file you intend to modify.

Open `LIVE-CONTEXT.md` and add rows to the **Active Work** table:

```markdown
| app/api/groups/route.ts | PR-042 (coding-agent) | 2024-01-15 09:00 UTC | IN PROGRESS |
| components/groups/GroupForm.tsx | PR-042 (coding-agent) | 2024-01-15 09:00 UTC | IN PROGRESS |
| messages/en.json | PR-042 (coding-agent) | 2024-01-15 09:00 UTC | IN PROGRESS |
| messages/ar.json | PR-042 (coding-agent) | 2024-01-15 09:00 UTC | IN PROGRESS |
| messages/ar-eg.json | PR-042 (coding-agent) | 2024-01-15 09:00 UTC | IN PROGRESS |
```

**Translation files (`messages/*.json`) are hotly contested.**
Multiple agents add keys simultaneously → always claim ALL THREE before touching any one.
Add your keys, then release. Do not hold them longer than needed.

**`CLAUDE.md` is also contested.**
Claim it, make your update, release it immediately. Don't hold it while doing other work.

---

## Step 2 — Do your work

Implement your feature/fix. Follow all standards in `skill-fix-standards.md`.

---

## Step 3 — Write the PR block

When your work is complete, append a **PR block** to the **Completed PRs** section of `LIVE-CONTEXT.md`.

### PR Block Format (copy this exactly)

```markdown
---
### PR-[NUMBER]: [title — one clear sentence]
**Agent:** [coding-agent | feature-builder | ux-designer | optimize-after-feature | archaeologist | etc.]
**Date:** YYYY-MM-DD HH:MM UTC
**Status:** COMPLETE

#### Files changed
| File | Change type | What changed |
|---|---|---|
| `app/api/groups/route.ts` | NEW | POST route using apiHandler, requires super_admin |
| `app/api/groups/[id]/route.ts` | NEW | GET/PATCH/DELETE with church_id filter on all ops |
| `components/groups/GroupForm.tsx` | NEW | Create/edit form with Zod validation + double-submit guard |
| `components/groups/GroupsTable.tsx` | NEW | Desktop table + mobile card list, empty state |
| `app/(app)/admin/groups/page.tsx` | NEW | Server Component, parallel fetch of groups + leaders |
| `app/(app)/admin/groups/loading.tsx` | NEW | Skeleton matching real layout |
| `messages/en.json` | MODIFIED | Added Groups.* keys (14 keys) |
| `messages/ar.json` | MODIFIED | Added Groups.* keys (14 keys) |
| `messages/ar-eg.json` | MODIFIED | Added Groups.* keys (14 keys) |

#### Translation keys added
```
Groups.title, Groups.action.create, Groups.action.edit, Groups.action.delete,
Groups.action.save, Groups.action.cancel, Groups.emptyState.title,
Groups.emptyState.body, Groups.emptyState.action, Groups.error.load,
Groups.error.save, Groups.form.name, Groups.form.nameAr, Groups.saved
```

#### Security
- church_id filter: ✅ on ALL queries — `.eq('church_id', churchId)`
- apiHandler: ✅ all routes use it
- Role check: `super_admin` for POST/PATCH/DELETE, any auth for GET
- IDOR prevention: ✅ `[id]` routes filter by both `id` AND `church_id`
- No `error.message` leaked to client: ✅

#### Database
- No migration required (uses existing `groups` table)
- Indexes: existing `(church_id)` index is sufficient for these queries
- RLS: existing policies cover this (SELECT for members, INSERT/UPDATE/DELETE for admins)

#### Tests written
- None (no framework configured — see DEBT-04)
- Tests needed: auth (401/403), church isolation, validation (422), CRUD happy path

#### What agents working near this need to know
- `GroupForm.tsx` now owns the groups create/edit UX — don't build another form for this
- The `groups` API follows the apiHandler pattern — use it as a template for other routes
- Translation namespace `Groups` is now established — add sub-keys there, not new namespaces
- `loading.tsx` exists at `app/(app)/admin/groups/loading.tsx` — don't recreate

#### Known issues / follow-up
- ARCH-3: Still 104 other routes on manual auth — this was the first migration
- PERF-2: `page.tsx` does 2 parallel fetches — could cache with `revalidateTag('groups-${churchId}')`
---
```

### Minimal PR block (for small fixes — use when only 1-2 files changed)

```markdown
---
### PR-[NUMBER]: [title]
**Agent:** [agent-name] | **Date:** YYYY-MM-DD | **Status:** COMPLETE
**Files:** `path/to/file.ts` (MODIFIED — what changed in one line)
**Impact:** what other agents need to know in 1-2 sentences
---
```

---

## Step 4 — Update the File Ownership Map

In `LIVE-CONTEXT.md` → File Ownership Map, update every file you touched:

```markdown
| app/api/groups/route.ts | PR-042 | coding-agent | New: POST + GET with apiHandler |
| app/api/groups/[id]/route.ts | PR-042 | coding-agent | New: GET/PATCH/DELETE |
| components/groups/GroupForm.tsx | PR-042 | coding-agent | New: create/edit form |
```

---

## Step 5 — Release your claims

In `LIVE-CONTEXT.md` → Active Work table, mark all your rows DONE:

```markdown
| app/api/groups/route.ts | PR-042 (coding-agent) | 2024-01-15 09:00 UTC | ✅ DONE — PR-042 |
```

Or delete the rows entirely. The File Ownership Map is the permanent record.

---

## Step 6 — Update Audit Progress (audit agents only)

If you are one of the 7 specialist audit agents (00–07), update the Audit Progress Tracker:

```markdown
| Architecture (01) | `architecture-report.md` | ✅ COMPLETE | 8 ARCH findings, worst: apiHandler gap (105 routes) |
```

---

## Step 7 — Append to Discovered Clues (investigation agents only)

If you're an investigation agent (Archaeologist, any specialist), append discoveries to the Codebase Map:

```markdown
### Discovered Clues
[ARCHAEOLOGIST 2024-01-15] BibleReader.tsx:195,203 — two empty catch blocks, silent failures
[SECURITY 2024-01-15] /api/auth/dev-login — no NODE_ENV guard, functional in production
[ARCHITECTURE 2024-01-15] lib/dashboard/queries.ts:1524 lines — ~100 any types, no church_id gaps found
```

Never overwrite other agents' entries. Append only.

---

## Conflict prevention rules

### Translation files — the most conflicting files in the codebase

Because 3 locale files (`messages/en.json`, `messages/ar.json`, `messages/ar-eg.json`) are touched by every feature:

1. **Claim all three before touching any one** — always together, never one at a time
2. **Add only your namespace keys** — don't reorganize or reformat the file
3. **Add at the correct nesting level** — check the existing structure first
4. **Release immediately after adding** — don't hold while working on other things

Pattern:
```bash
# Check what's already there before adding
cat messages/en.json | grep -A 5 '"Groups"'
```

### CLAUDE.md — high traffic, claim briefly

CLAUDE.md is read by every agent and updated often. Rules:
1. Claim it
2. Make your update (add to the change log, update relevant section)
3. Release within the same task — don't hold it for multiple subtasks

### `lib/dashboard/queries.ts` — everyone needs it, it's a mess

This 1,524-line file is a structural problem. Until it's refactored:
- Claim the whole file even if you're only adding a function
- Note which lines you added in your PR block (e.g. "added lines 1525-1580: member dashboard query")
- Any agent splitting this file should claim it exclusively and coordinate with CTO agent

### `app/(app)/dashboard/page.tsx` — most visited page

Changes here affect all users. Extra scrutiny:
- Always test in RTL
- Always check loading state
- Never add a sequential await (use `Promise.all`)
- Coordinate with any agent working on dashboard queries

---

## Reading PRs before working in an area

If you're about to work in a module and there are existing PRs in that area, read them:

```bash
# Example: before working on finance module
grep -A 30 "PR-" LIVE-CONTEXT.md | grep -A 30 "finance"
```

This tells you:
- What patterns have been established
- What translation keys already exist
- What tests have been written
- What follow-up was explicitly noted

---

## Emergency: file is claimed but agent seems stuck

If a file has been IN PROGRESS for more than 2 hours with no update:
1. Check if the agent completed work and forgot to update LIVE-CONTEXT.md
2. Read the file to see if changes are there
3. If the agent is stuck/dead, you can take over — note "taking over from PR-XXX" in your claim

---

## Quick reference — what to update in LIVE-CONTEXT.md

| Event | What to write |
|---|---|
| Starting work | Claim in Active Work table |
| Finishing work | PR block in Completed PRs + File Ownership Map update + release Active Work |
| Discovering a bug/issue | Append to Discovered Clues |
| Making an architectural decision | Append to Decisions Log |
| Adding a blocker | Append to Blockers table |
| Audit agent finishing | Update Audit Progress Tracker |