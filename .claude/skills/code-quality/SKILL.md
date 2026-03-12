---
name: ekklesia-code-quality
description: Code quality, structure, and cleanliness standards for the Ekklesia church management app. Read this skill before writing new features, refactoring existing code, reviewing code, or adding new modules. Use whenever an agent is building new functionality, restructuring files, adding components, or doing any work that involves writing new code rather than just optimizing queries.
---

# Ekklesia Code Quality & Structure

## What this skill covers

- File structure rules (components, pages, API routes)
- Server vs Client Component split pattern
- Optimistic UI for mutations
- API route pattern (apiHandler — mandatory)
- Zod schema pattern
- Translation pattern (useTranslations / getTranslations)
- Mobile-first component pattern (card list + table split)
- TypeScript rules
- Code review checklist (run before marking done)

## Before You Start

1. Read `CLAUDE.md` for project context, stack, and non-negotiables.
2. Read the existing code in the module you're working in before writing anything new.
3. Follow the existing patterns — do not invent new patterns without documenting them in `CLAUDE.md`.

---

## File Structure Rules

### Component files
```
components/
├── [module]/           # Module-specific components
│   ├── [Name].tsx      # PascalCase, one component per file
│   └── index.ts        # Re-exports if module has many components
└── shared/             # Used across multiple modules
```

### Page files
```
app/(app)/[route]/
├── page.tsx            # Server Component — data fetching only
├── loading.tsx         # Skeleton — required for every page
├── error.tsx           # Error boundary — add for complex pages
└── [Name]Client.tsx    # Client Component — interactivity only
```

### API routes
```
app/api/[resource]/
├── route.ts            # Collection: GET (list), POST (create)
└── [id]/
    └── route.ts        # Item: GET (detail), PUT/PATCH (update), DELETE
```

---

## Component Patterns

### Server vs Client Component split

```tsx
// page.tsx — ALWAYS a Server Component
// Fetches data, passes to client component
// Never has 'use client', useState, useEffect, event handlers

import { getCurrentUserWithRole } from '@/lib/auth'

export default async function DonationsPage({ searchParams }) {
  const user = await getCurrentUserWithRole()
  const donations = await getDonations(user.profile.church_id, searchParams)

  return <DonationsClient initialDonations={donations} churchId={user.profile.church_id} />
}

// DonationsClient.tsx — Client Component
// Handles interactivity: filters, modals, optimistic updates
// Receives data as props, never fetches from API on mount

'use client'
export function DonationsClient({ initialDonations, churchId }) {
  const [donations, setDonations] = useState(initialDonations)
  // ...
}
```

### Optimistic UI for mutations

```tsx
'use client'
export function DonationItem({ donation, churchId }) {
  const [optimisticDonation, setOptimisticDonation] = useState(donation)
  const [isPending, setIsPending] = useState(false)

  const handleUpdate = async (updates) => {
    setOptimisticDonation(prev => ({ ...prev, ...updates }))  // immediate
    setIsPending(true)
    try {
      await updateDonation(donation.id, updates)
    } catch {
      setOptimisticDonation(donation)  // rollback on error
    } finally {
      setIsPending(false)
    }
  }
}
```

---

## API Route Pattern

Every API route must use `apiHandler`. No exceptions.

```ts
// app/api/donations/route.ts
import { apiHandler } from '@/lib/api/handler'
import { validateBody } from '@/lib/api/validate'
import { createDonationSchema } from '@/lib/schemas/donation'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

// List
export const GET = apiHandler(async ({ supabase, profile }) => {
  const PAGE_SIZE = 25

  const { data, count } = await supabase
    .from('donations')
    .select('id, amount, date, status, fund_id', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('date', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  return NextResponse.json({ data, count })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// Create
export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = await validateBody(req, createDonationSchema)

  const { data, error } = await supabase
    .from('donations')
    .insert({ ...body, church_id: profile.church_id, created_by: user.id })
    .select()
    .single()

  if (error) throw error

  revalidateTag(`donations-${profile.church_id}`)
  revalidateTag(`finance-summary-${profile.church_id}`)

  return NextResponse.json(data, { status: 201 })
}, { requireRoles: ['ministry_leader', 'super_admin'] })
```

---

## Zod Schema Pattern

```ts
// lib/schemas/donation.ts
import { z } from 'zod'

export const createDonationSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime({ offset: true }),
  fund_id: z.string().uuid('Invalid fund ID'),
  method: z.enum(['cash', 'check', 'transfer', 'card', 'other']),
  notes: z.string().max(500).optional(),
  donor_profile_id: z.string().uuid().optional(),
})

export const updateDonationSchema = createDonationSchema.partial()

export type CreateDonationInput = z.infer<typeof createDonationSchema>
export type UpdateDonationInput = z.infer<typeof updateDonationSchema>
```

---

## Translation Pattern

```tsx
// Server component
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('donations')
  return <h1>{t('title')}</h1>
}

// Client component
'use client'
import { useTranslations } from 'next-intl'

export function DonationCard() {
  const t = useTranslations('donations')
  return <span>{t('status.pending')}</span>
}

// Translation files — always add to ALL THREE:
// messages/en.json
// messages/ar.json
// messages/ar-eg.json
```

---

## Mobile-First Component Pattern

Every list/table component:

```tsx
export function ItemList({ items }) {
  return (
    <div>
      {/* Mobile: card list */}
      <div className="md:hidden divide-y divide-zinc-100">
        {items.map(item => (
          <MobileCard key={item.id} item={item} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-start py-3 ps-4 font-medium text-zinc-500">
                {t('column.name')}
              </th>
              {/* More columns */}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map(item => (
              <TableRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## TypeScript Rules

```ts
// Use domain types from types/index.ts, not raw Supabase types directly in UI
import type { Donation, DonationWithDonor } from '@/types'

// Never use `any` — if needed, use `unknown` and narrow
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'amount' in data) {
    // now TypeScript knows
  }
}

// Explicit return types on server actions and API handlers
async function getDonations(churchId: string): Promise<Donation[]> {
  // ...
}

// Null-safe optional chaining everywhere
const name = member?.profile?.first_name ?? t('common.unknown')
```

---

## Code Review Checklist

Before marking any task done:

```bash
# 1. TypeScript: 0 errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 2. RTL: 0 violations
grep -rn "\bml-[0-9]\|\bmr-[0-9]\|\btext-right\b\|\btext-left\b" \
  app/ components/ --include="*.tsx" | grep -v "//" | wc -l

# 3. Hardcoded strings (should be 0 new ones)
grep -rn '"[A-Z][a-z].*"' app/ components/ --include="*.tsx" \
  | grep -v "node_modules\|//\|className\|placeholder.*=.*\"\|type=\|href=\|id=\|name=" \
  | head -20

# 4. select('*') (should be 0 new ones)
grep -rn "\.select('\*')\|\.select(\"*\")" app/ lib/ | grep -v node_modules | grep -v ".next"

# 5. Build clean
npm run build 2>&1 | tail -5
```
