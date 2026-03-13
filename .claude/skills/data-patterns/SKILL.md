---
name: data-patterns
description: Data fetching and API route patterns for the Ekklesia app — Supabase queries, apiHandler, Zod validation, pagination, caching, permissions, and finance double-entry rules.
---

# Skill: Data Patterns — Ekklesia

No ORM. No React Query. No tRPC. Data flows one way: Server Components query Supabase directly. Client Components call API routes. API routes query Supabase via the query builder. The `apiHandler` wrapper handles auth, roles, and errors for all routes.

---

## Server Component data fetching

Server Components query Supabase directly using the server client. Data is passed to Client Components as props, or used via Server Component composition.

```typescript
// app/(app)/admin/groups/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'

export default async function GroupsPage() {
  const { profile, churchId } = await getCurrentUserWithRole()
  const supabase = await createClient()
  const t = await getTranslations('Groups')

  // ALWAYS filter by church_id
  // ALWAYS select specific fields on lists — never select('*')
  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, name, name_ar, type, leader_id, is_active, max_members')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[GroupsPage] Failed to fetch groups:', error)
    return <ErrorState message={t('error.load')} />
  }

  return <GroupsTable groups={groups} churchId={churchId} />
}

// Required on all authenticated pages
export const dynamic = 'force-dynamic'
```

### Parallel fetches — always use Promise.all for independent queries

On Egyptian 3G (200-500ms per round trip), sequential fetches multiply latency.

```typescript
// WRONG — sequential, each waits for the previous
const { data: groups } = await supabase.from('groups').eq('church_id', churchId)
const { data: ministries } = await supabase.from('ministries').eq('church_id', churchId)
const { data: members } = await supabase.from('profiles').eq('church_id', churchId)
// Total: ~900ms on 3G

// CORRECT — parallel, all run simultaneously
const [groupsResult, ministriesResult, membersResult] = await Promise.all([
  supabase.from('groups').select('id, name, name_ar').eq('church_id', churchId),
  supabase.from('ministries').select('id, name, name_ar').eq('church_id', churchId),
  supabase.from('profiles').select('id, first_name, last_name, role').eq('church_id', churchId).eq('status', 'active'),
])
// Total: ~300ms on 3G (only the slowest query)

const groups = groupsResult.data ?? []
const ministries = ministriesResult.data ?? []
const members = membersResult.data ?? []
```

---

## API route pattern — apiHandler (use for ALL routes)

`lib/api/handler.ts` is the only acceptable auth pattern for API routes.
It provides: auth verification, church_id, profile, role checking, error handling, timing headers.

```typescript
// app/api/groups/route.ts
import { apiHandler } from '@/lib/api/handler'
import { validateBody } from '@/lib/api/validate'
import { createGroupSchema } from '@/lib/schemas/groups'
import { revalidateTag } from 'next/cache'

// GET — list
export const GET = apiHandler(async ({ supabase, churchId }) => {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, name_ar, type, leader_id, is_active')
    .eq('church_id', churchId)
    .order('name')

  if (error) throw error
  return Response.json({ groups: data })
})

// POST — create
export const POST = apiHandler(async ({ req, supabase, churchId, profile }) => {
  const body = await validateBody(req, createGroupSchema)

  const { data, error } = await supabase
    .from('groups')
    .insert({
      ...body,
      church_id: churchId,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) throw error

  revalidateTag(`groups-${churchId}`)
  return Response.json({ group: data }, { status: 201 })
}, { requireRoles: ['super_admin', 'ministry_leader'] })
```

### ID routes — ALWAYS filter by BOTH id AND church_id

```typescript
// app/api/groups/[id]/route.ts
export const GET = apiHandler(async ({ supabase, churchId, params }) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')           // select('*') is OK on single-record detail routes
    .eq('id', params.id)
    .eq('church_id', churchId)  // MANDATORY — prevents IDOR
    .single()

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ group: data })
})

export const PATCH = apiHandler(async ({ req, supabase, churchId, params }) => {
  const body = await validateBody(req, updateGroupSchema)

  const { data, error } = await supabase
    .from('groups')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('church_id', churchId)  // MANDATORY
    .select()
    .single()

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  revalidateTag(`groups-${churchId}`)
  return Response.json({ group: data })
}, { requireRoles: ['super_admin', 'ministry_leader'] })

export const DELETE = apiHandler(async ({ supabase, churchId, params }) => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', params.id)
    .eq('church_id', churchId)  // MANDATORY

  if (error) throw error

  revalidateTag(`groups-${churchId}`)
  return Response.json({ success: true })
}, { requireRoles: ['super_admin'] })
```

---

## Zod validation schemas

All API input validated with Zod. Schemas live in `lib/schemas/`.

```typescript
// lib/schemas/groups.ts
import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  name_ar: z.string().min(1, 'مطلوب').max(100),
  type: z.enum(['small_group', 'bible_study', 'youth', 'kids', 'other']),
  ministry_id: z.string().uuid().optional().nullable(),
  leader_id: z.string().uuid(),
  meeting_day: z.string().optional(),
  meeting_time: z.string().optional(),
  meeting_location: z.string().optional(),
  max_members: z.number().int().positive().max(500).optional(),
  is_open: z.boolean().default(true),
})

export const updateGroupSchema = createGroupSchema.partial()

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
```

Using in API routes:
```typescript
const body = await validateBody(req, createGroupSchema)
// throws ValidationError (→ 422) automatically if invalid
// body is fully typed as CreateGroupInput
```

---

## Client-side fetching — fetch() to API routes

Client Components use `fetch()` to call API routes. Always with AbortController.

```typescript
"use client"
import { useState, useEffect } from 'react'
import type { Group } from '@/types'

export function GroupDetail({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/groups/${groupId}`, { signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then(data => setGroup(data.group))
      .catch(err => {
        if (err.name !== 'AbortError') {
          toast.error(t('error.load'))
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [groupId])

  if (loading) return <GroupDetailSkeleton />
  if (!group) return <NotFound />
  return <GroupDetailView group={group} />
}
```

---

## Cache invalidation

After every mutation, call `revalidateTag` or `revalidatePath`:

```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

// Tag-based (preferred — more targeted)
revalidateTag(`groups-${churchId}`)
revalidateTag(`dashboard-${churchId}`)
revalidateTag(`members-${churchId}`)

// Path-based (when tags aren't set up on the page)
revalidatePath('/admin/groups')
revalidatePath(`/admin/groups/${id}`)
revalidatePath('/dashboard')
```

Tag naming: `{resource}-{churchId}` — always church-scoped.

Cache TTL conventions (set as Cache-Control on GET routes):
- Real-time data (attendance, notifications): 15 seconds
- List data (groups, members, events): 30 seconds
- Dashboard aggregations: 300 seconds (5 minutes)
- Reference data (bible versions, church leaders): 3600 seconds (1 hour)

---

## Pagination pattern

All list queries use consistent pagination.

```typescript
const PAGE_SIZE = 25

export const GET = apiHandler(async ({ req, supabase, churchId }) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const { data, count, error } = await supabase
    .from('groups')
    .select('id, name, name_ar, type', { count: 'exact' })
    .eq('church_id', churchId)
    .range(offset, offset + PAGE_SIZE - 1)
    .order('name')

  if (error) throw error

  return Response.json({
    groups: data,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: (count ?? 0) > offset + PAGE_SIZE,
  })
})
```

---

## Permission checks in routes

```typescript
export const POST = apiHandler(async ({ supabase, churchId, profile }) => {
  // Role check happens automatically in apiHandler options
  // For granular permission checks beyond role:
  if (!profile.permissions?.manage_members) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}, { requireRoles: ['super_admin', 'ministry_leader'] })
```

---

## Feature flag checks

```typescript
import { isFeatureEnabled } from '@/lib/features'

// In Server Components
const hasFinance = await isFeatureEnabled(churchId, 'finance')
if (!hasFinance) return notFound()

// In API routes
export const GET = apiHandler(async ({ churchId }) => {
  const hasFinance = await isFeatureEnabled(churchId, 'finance')
  if (!hasFinance) {
    return Response.json({ error: 'Feature not enabled' }, { status: 403 })
  }
  // ...
})
```

---

## Error response format — consistent across all routes

```typescript
// apiHandler handles these automatically:
// 401 — unauthenticated
// 403 — wrong role
// 422 — validation error (from validateBody)
// 500 — unhandled exception (generic message, never leaks internals)

// Manual error responses you write:
return Response.json({ error: 'Not found' }, { status: 404 })
return Response.json({ error: 'Forbidden' }, { status: 403 })
return Response.json({ error: 'Conflict' }, { status: 409 })

// NEVER leak internal error details
return Response.json({ error: error.message }, { status: 500 })  // WRONG
return Response.json({ error: 'Internal server error' }, { status: 500 })  // CORRECT
```

---

## Finance routes — extra care required

Finance mutations must maintain double-entry integrity.

```typescript
export const POST = apiHandler(async ({ req, supabase, churchId, profile }) => {
  const body = await validateBody(req, createTransactionSchema)

  // Validate double-entry BEFORE inserting
  const totalDebits = body.lineItems.reduce((sum, item) => sum + (item.debitAmount ?? 0), 0)
  const totalCredits = body.lineItems.reduce((sum, item) => sum + (item.creditAmount ?? 0), 0)
  if (Math.abs(totalDebits - totalCredits) > 0.001) {
    return Response.json(
      { error: 'Transaction is not balanced', details: { debits: totalDebits, credits: totalCredits } },
      { status: 422 }
    )
  }

  // Use Supabase RPC for atomic multi-table operations
  const { data, error } = await supabase.rpc('create_financial_transaction', {
    p_church_id: churchId,
    p_transaction_data: body,
    p_line_items: body.lineItems,
    p_created_by: profile.id,
  })

  if (error) throw error

  revalidateTag(`finance-${churchId}`)
  revalidateTag(`dashboard-${churchId}`)
  return Response.json({ transaction: data }, { status: 201 })
}, { requireRoles: ['super_admin'] })
```

---

## Anti-patterns — never copy

1. Manual auth in API routes — use `apiHandler`
2. `.eq('id', param)` without `.eq('church_id', churchId)` — IDOR vulnerability
3. `select('*')` on list queries — select specific fields
4. Sequential awaits for independent queries — use `Promise.all`
5. Returning `error.message` to client — leaks internal details
6. Missing `revalidateTag` after mutations — stale data shown to users
7. fetch() in useEffect without AbortController — memory leak
8. Using `getSession()` instead of `getUser()` in API routes — JWT can be spoofed