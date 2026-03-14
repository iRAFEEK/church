---
name: ekklesia-fix-standards
description: Pre-fix checklist and coding standards for the Ekklesia church management app. Read this before any fix, refactor, or code change — covers apiHandler, church_id, i18n, TypeScript, RTL, and change scope rules.
---

# Skill: Fix Standards — Ekklesia

This is a church management platform serving real communities. Wrong code means wrong donation records, members locked out, or private prayer requests exposed. Standards are non-negotiable. Read this before touching any file.

---

## Pre-fix checklist — answer every question before writing code

### 1. Does this route use apiHandler?

Check the file you're changing. Is it using `apiHandler` from `lib/api/handler.ts`?

```typescript
// CORRECT pattern — apiHandler
import { apiHandler } from '@/lib/api/handler'
export const GET = apiHandler(async ({ supabase, churchId, profile }) => { })

// LEGACY pattern — manual (105 routes still do this)
export async function GET(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**If you find the legacy pattern:** Migrate it to `apiHandler` as part of your change.
If the scope is too large, note it as explicit follow-up — never leave it undocumented.

### 2. Does every query filter by church_id?

For EVERY Supabase query in the file — does it include `.eq('church_id', churchId)`?

```typescript
// CORRECT
.from('donations').eq('id', id).eq('church_id', churchId)

// WRONG — IDOR vulnerability (user A reads user B's church data)
.from('donations').eq('id', id)
```

If church_id filter is missing → this is a security bug, not a style issue. Fix it.

### 3. Does the page have a loading.tsx?

If you're touching a `page.tsx` — does it have a sibling `loading.tsx`?
59 pages are missing it. If the one you're touching doesn't have it → create it.
Users are on 3G. A blank screen looks like a broken app.

### 4. Are there hardcoded English strings?

Search the file for string literals in JSX not going through `t()`.
Every user-visible string must use `useTranslations()` / `getTranslations()`.

### 5. Is this a finance module change?

If yes — extra care:
- Is double-entry balance validated before insert? (`sum(debit) === sum(credit)`)
- Is the operation wrapped in an RPC for atomicity?
- Are fund restrictions enforced?
- Can the approval workflow be bypassed by calling this route directly?

### 6. Is this a shared component?

Components in `components/` are used across all features.
Does your change work correctly in both LTR (English) and RTL (Arabic) layouts?
Does it work at 360px width?

---

## TypeScript standards

### Strict mode is ON — tsconfig has `"strict": true`

```typescript
// NEVER — 270+ violations already exist, add zero more
const result: any = await fetchData()
catch (error: any) { }
const value = data as Profile  // unsafe cast

// CORRECT — narrow the type properly
const result: Group[] = await fetchData()
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
}
// For Supabase results — use the typed query result directly
const { data: group } = await supabase
  .from('groups')
  .select('id, name, name_ar')
  .eq('id', id)
  .single()
// group is typed as { id: string; name: string; name_ar: string } | null
```

### Non-null assertions — only for env vars and Next.js params

```typescript
// ACCEPTABLE
process.env.NEXT_PUBLIC_SUPABASE_URL!  // validated at startup
params.id!                             // always present if route matched

// NOT ACCEPTABLE — use optional chaining or explicit null check
user!.profile          // crashes if profile not loaded
data!.group            // crashes if join returned nothing
```

### Supabase query result typing

Don't cast Supabase results. Select exactly what you need and let TypeScript infer:

```typescript
// WRONG — unsafe cast
const groups = data as Group[]

// CORRECT — type is inferred from your select() fields
const { data: groups } = await supabase
  .from('groups')
  .select('id, name, name_ar, type, leader_id')
  .eq('church_id', churchId)
// groups is correctly typed as Array<{id: string, name: string, ...}> | null
```

---

## Code style rules

### File naming — kebab-case always

```
components/groups/group-form.tsx          ✅
components/groups/GroupForm.tsx           ✅  (PascalCase also acceptable for components)
app/(app)/admin/groups/page.tsx           ✅
lib/schemas/groups.ts                     ✅
app/api/groups/route.ts                   ✅
```

### Import paths — always absolute with `@/`

```typescript
// NEVER — relative paths
import { GroupForm } from '../../components/groups/GroupForm'
import { apiHandler } from '../../../lib/api/handler'

// ALWAYS — absolute paths
import { GroupForm } from '@/components/groups/GroupForm'
import { apiHandler } from '@/lib/api/handler'
```

### No console.log in production code

```typescript
// NEVER in components or API routes
console.log('debug:', data)

// For errors — console.error is acceptable as temporary logging
// until structured logging is added
console.error('[GroupsPage] Failed to fetch:', error)

// Sensitive data NEVER logged
console.log('user data:', profile)    // NEVER — PII
console.log('donation amount:', amt)  // NEVER — financial data
```

### Tailwind — logical RTL properties only

```typescript
// NEVER — breaks RTL layout
className="ml-3 mr-2 pl-4 pr-2 text-left"

// ALWAYS — works in both LTR and RTL
className="ms-3 me-2 ps-4 pe-2 text-start"
```

---

## Change scope rules

### Fix exactly what was asked

**Do NOT:**
- Refactor unrelated code in files you touch
- Rename things that aren't the specific problem
- Reorganize imports in files you aren't directly fixing
- Fix other issues you notice while working (note them, don't fix them)
- Add features not requested
- Add new dependencies without explicit approval

**DO:**
- Fix the exact issue described
- Create `loading.tsx` if the page doesn't have one
- Migrate the route to `apiHandler` if it uses the legacy pattern
- Add the missing `church_id` filter if it's absent
- Add translation keys to all 3 locale files if new strings were added
- Write tests for what you changed

### Pattern matching — find the existing example first

Before writing any new code, find 2-3 existing examples of the same thing:

- Writing a new API route? → Read `app/api/community/needs/route.ts` (uses apiHandler correctly)
- Writing a new page? → Read `app/(app)/admin/groups/page.tsx`
- Writing a new form? → Read `components/groups/GroupForm.tsx`
- Writing a provider? → There are none (no context providers in Ekklesia — use props or Server Components)
- Writing a Supabase query? → Find a similar query in an adjacent file

Your code must look like it was written by the same person who wrote those examples.

---

## Known anti-patterns — never copy from these files

These files contain patterns that exist but should NOT be copied:

**Manual API auth (105 routes — do NOT copy this pattern):**
```typescript
// LEGACY — found in 105 routes, do not copy
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**`any` types in lib/dashboard/queries.ts (~100 instances):**
```typescript
// LEGACY — do not copy
const results: any[] = data.map((row: any) => ({
  count: row.count as number,
}))
```

**Returning error.message to client:**
```typescript
// WRONG — found in some manual routes, do not copy
return NextResponse.json({ error: error.message }, { status: 500 })
```

**Empty catch blocks in BibleReader.tsx:**
```typescript
// WRONG — found at lines 195 and 203, do not copy
} catch {
  // silent failure
}
```

---

## After making a change — state all of this

Never say a change is "complete" without addressing every item:

```
Files changed:
- path/to/file.ts — what changed and why

Security:
- church_id filter: ✅ present on all queries
- apiHandler: ✅ used | ✅ migrated from manual | ⚠️ follow-up: [file]
- No error.message leaked to client: ✅

i18n:
- ✅ All 3 locale files updated — added keys: [list]
- ✅ No new hardcoded strings

UX / mobile:
- loading.tsx: ✅ exists | ✅ created
- Empty state: ✅ handled
- Touch targets: ✅ all h-11 minimum
- Double-submit guard: ✅ | not applicable

TypeScript:
- No new `any` introduced: ✅
- No unsafe casts: ✅

Performance:
- Parallel fetches where applicable: ✅
- Specific .select() fields on lists: ✅

Tests written/documented:
- [each test with what it verifies]

Follow-up required:
- [anything intentionally not done]
- [known edge cases not yet handled]
```

---

## ESLint — what's enforced

`eslint-config-next` (standard Next.js rules). No custom config.
Run before committing: `npm run lint`

No pre-commit hooks exist yet — you must run lint manually.

Key rules:
- No unused variables
- No unused imports
- React hooks rules (exhaustive-deps)
- Next.js image optimization warnings
- No `<a>` tags (use `<Link>`)

---

## TODO comments — always include a GitHub issue reference

```typescript
// NEVER — no tracking
// TODO: fix this later

// CORRECT — always trackable
// TODO: migrate to apiHandler [GitHub #123]
// TODO: add test coverage for edge case [GitHub #124]
```