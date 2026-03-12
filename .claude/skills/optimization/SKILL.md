---
name: ekklesia-optimization
description: Performance optimization patterns for the Ekklesia church management app. Read this skill before any performance work: slow page fixes, query optimization, bundle reduction, caching, pagination, database indexes, loading states, or Lighthouse score improvements. Use whenever an agent is asked to make something faster, fix slow loading, reduce bundle size, or improve perceived performance.
---

# Ekklesia Performance Optimization

## What this skill covers

- P1: Parallelize sequential fetches (Promise.all)
- P2: Narrow select() — stop fetching unused columns
- P3: Cache with unstable_cache + revalidateTag
- P4: Paginate list queries with .range()
- P5: Dynamic import heavy components (recharts, etc.)
- P6: Add loading.tsx skeletons
- P7: Move client fetches to Server Components
- P8: Suspense boundaries for independent sections
- P9: SQL aggregation via RPC (stop aggregating in JS)
- P10: Database indexes

Read the full pattern for whichever applies to your task.

## Before You Start

1. Read `CLAUDE.md` for project context, stack, and non-negotiables.
2. Run a baseline measurement before changing anything (bundle size, TTFB, or Lighthouse).
3. Diagnose first, fix second. Write out every problem you find before touching code.

---

## Diagnosis Checklist

Run these checks on any slow page/module before writing fixes:

### Query patterns
```bash
# Sequential awaits (should be Promise.all)
grep -n "await supabase\|const {.*} = await" [FILE] | head -20

# select('*') — over-fetching
grep -n "\.select('\*')\|\.select(\"*\")" [FILE]

# Missing pagination
grep -n "\.from(\|\.range(\|\.limit(" [FILE]

# Missing cache
grep -n "unstable_cache\|revalidateTag\|Cache-Control" [FILE]
```

### Bundle
```bash
# Eager heavy imports
grep -n "import.*recharts\|import.*chart\|import.*d3\|import.*xlsx" [FILE]

# Missing dynamic imports
grep -n "dynamic(" [FILE]
```

### Loading states
```bash
# Missing loading.tsx
ls $(dirname [FILE])/loading.tsx 2>/dev/null || echo "MISSING"
```

---

## Fix Patterns (apply in this priority order)

### P1 — Parallelize Sequential Fetches
**Impact: 200–800ms saved per sequential query**

```ts
// BEFORE
const { data: a } = await supabase.from('table_a').select(...)
const { data: b } = await supabase.from('table_b').select(...)
const { data: c } = await supabase.from('table_c').select(...)

// AFTER
const [{ data: a }, { data: b }, { data: c }] = await Promise.all([
  supabase.from('table_a').select(...),
  supabase.from('table_b').select(...),
  supabase.from('table_c').select(...),
])
```

### P2 — Narrow select()
**Impact: 30–70% reduction in data transfer**

```ts
// BEFORE — fetches every column including large fields
.select('*')

// AFTER — only what the UI actually renders
.select('id, name, amount, date, status')
// For dropdowns: only id + display name(s)
// For list rows: only columns visible in the card/table
// For detail pages: all columns except large unused blobs
```

### P3 — Cache with unstable_cache + revalidateTag
**Impact: Eliminates DB round trip on subsequent loads**

```ts
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'

// In data fetching file or page:
const getData = unstable_cache(
  async (churchId: string) => {
    const { data } = await supabase.from('...').select('...')
    return data ?? []
  },
  ['unique-cache-key'],  // must be globally unique
  {
    tags: [`entity-${churchId}`],  // for targeted invalidation
    revalidate: 300,               // TTL in seconds
  }
)

// In mutation API route (POST/PUT/DELETE):
revalidateTag(`entity-${churchId}`)
```

**TTL Guidelines:**
- Dashboard aggregates: 300s
- Reference data (funds, accounts, groups, areas): 3600s
- Member/attendance lists: 300s
- Finance lists: 30s
- Finance reports: 600s
- Anything user writes in real-time: 0 (no cache)

### P4 — Paginate List Queries
**Impact: Fixes blank-screen timeouts on large datasets**

```ts
const PAGE_SIZE = 25
const page = parseInt(searchParams.page ?? '1', 10)
const offset = (page - 1) * PAGE_SIZE

const { data, count } = await supabase
  .from('table')
  .select('...', { count: 'exact' })
  .eq('church_id', churchId)
  .order('created_at', { ascending: false })
  .range(offset, offset + PAGE_SIZE - 1)

const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
```

Pagination UI — always RTL-safe:
```tsx
<ChevronLeft className="h-4 w-4 rtl:rotate-180" />
<ChevronRight className="h-4 w-4 rtl:rotate-180" />
```

### P5 — Dynamic Import Heavy Components
**Impact: 50–150KB bundle reduction per component**

```ts
import dynamic from 'next/dynamic'

// Charts, data grids, rich text editors, PDF viewers, etc.
const HeavyChart = dynamic(
  () => import('@/components/HeavyChart'),
  {
    loading: () => <div className="h-64 bg-zinc-100 animate-pulse rounded-xl" />,
    ssr: false,
  }
)
```

Heavy libraries to always dynamically import: recharts, @nivo/*, d3, xlsx, pdfjs, driver.js, any library >30KB.

### P6 — Add loading.tsx Skeletons
**Impact: Perceived performance — eliminates blank screen**

Every page directory must have a `loading.tsx`. Skeleton must match the page's visual layout to prevent layout shift.

```tsx
// Skeleton matches the page layout exactly
export default function PageLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-zinc-100 animate-pulse rounded-lg" />
        <div className="h-9 w-24 bg-zinc-100 animate-pulse rounded-lg" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-zinc-100 animate-pulse rounded-xl" />
      ))}
    </div>
  )
}
```

### P7 — Move Client Fetches to Server Components
**Impact: Eliminates 300–800ms waterfall on 3G**

If a client component fetches via `useEffect` + `fetch('/api/...')`:
1. Fetch in the parent Server Component instead
2. Pass data as props to the client component
3. Keep the client component for interactivity only

### P8 — Suspense Boundaries for Independent Sections
**Impact: Fast sections render immediately, slow sections fill in**

```tsx
// Page with independently fast + slow sections
export default async function Page() {
  const fastData = await getFastData()  // runs immediately

  return (
    <div>
      <FastSection data={fastData} />  {/* renders immediately */}

      <Suspense fallback={<SlowSectionSkeleton />}>
        <SlowSection />  {/* async server component — doesn't block above */}
      </Suspense>
    </div>
  )
}
```

### P9 — SQL Aggregation via RPC
**Impact: Replaces JS reduce() over thousands of rows with single DB call**

When a page does JS aggregation over fetched rows, replace with an RPC function:

```sql
CREATE OR REPLACE FUNCTION get_summary(p_church_id UUID, p_start DATE, p_end DATE)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', SUM(amount),
      'count', COUNT(*),
      'by_category', json_agg(...)
    )
    FROM table
    WHERE church_id = p_church_id AND date BETWEEN p_start AND p_end
  );
END;
$$;
```

### P10 — Database Indexes
**Impact: 10x–100x query speed improvement on large tables**

Add indexes for every column used in WHERE, JOIN ON, or ORDER BY on large tables:

```sql
-- Compound index: most selective column first, then sort column
CREATE INDEX IF NOT EXISTS idx_table_church_date
  ON table_name(church_id, created_at DESC);

-- For text search
CREATE INDEX IF NOT EXISTS idx_table_fts
  ON table_name USING GIN(to_tsvector('english', name || ' ' || COALESCE(notes, '')));
```

**Rules:**
- Always use `IF NOT EXISTS`
- `church_id` is always the first column in compound indexes (it's the most selective filter)
- Only add indexes for columns you found being filtered — speculative indexes hurt write performance
- Put all new indexes in a new migration file (`03X_[description]_indexes.sql`)

---

## Measurement

### Before any optimization work:
```bash
npm run build 2>&1 | grep "kB" > /tmp/baseline.txt
```

### After optimization work:
```bash
npm run build 2>&1 | grep "kB" > /tmp/after.txt
diff /tmp/baseline.txt /tmp/after.txt
```

### Verification (must pass before task is complete):
```bash
# TypeScript: 0 errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# RTL: 0 violations
grep -rn "\bml-[0-9]\|\bmr-[0-9]\|\btext-right\b\|\btext-left\b" \
  app/ components/ --include="*.tsx" | grep -v "//" | wc -l

# Build clean
npm run build 2>&1 | tail -5
```

---

## Summary Format

After optimization work, report in this format:

```
## Optimization Complete

### Problems Found and Fixed
| Problem | Location | Fix | Impact |
|---------|----------|-----|--------|
| Sequential fetches | donations/page.tsx | Promise.all | ~400ms saved |
| select('*') | transactions route | Narrowed to 8 cols | ~40% data reduction |
| No pagination | expenses list | 25/page with range() | Fixes timeout at scale |
| No cache | funds reference data | 3600s unstable_cache | Eliminates round trip |

### Bundle Changes
| Route | Before | After | Delta |
|-------|--------|-------|-------|
| /admin/finance | 320KB | 198KB | -122KB |

### Checklist
- [ ] TypeScript: 0 errors
- [ ] RTL: 0 violations
- [ ] loading.tsx: all pages covered
- [ ] Pagination: all lists paginated
- [ ] Build: clean
```
