# Skill: Component Patterns — Ekklesia

This document describes how to write components, hooks, and UI in the Ekklesia codebase. Every code change involving UI must match these patterns exactly. When in doubt, find an existing component that does something similar and copy its structure.

---

## Server vs Client Components

### The rule: default to Server Components

Most components fetch data and render it. These should be Server Components — no `"use client"` directive, no hooks, data fetched directly from Supabase.

Only add `"use client"` when the component genuinely needs:
- `useState` or `useReducer`
- `useEffect`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `navigator`)
- Client-side hooks (`useRouter`, `usePathname`, `useTranslations` in client context)

```typescript
// Server Component — no directive needed
// app/(app)/admin/groups/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'

export default async function GroupsPage() {
  const { churchId } = await getCurrentUserWithRole()
  const supabase = await createClient()
  const t = await getTranslations('Groups')

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, name_ar, type, is_active')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <GroupsTable groups={groups ?? []} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
```

```typescript
// Client Component — needs interactivity
// components/groups/GroupForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { groupSchema, type GroupFormValues } from '@/lib/schemas/groups'

export function GroupForm() {
  const t = useTranslations('Groups')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
  })

  const onSubmit = async (values: GroupFormValues) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(t('saved'))
      router.push('/admin/groups')
      router.refresh()
    } catch {
      toast.error(t('error.save'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
      <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
        {isSubmitting ? t('saving') : t('action.save')}
      </Button>
    </form>
  )
}
```

---

## Import order (strict)

Follow this exact order in every file:

```typescript
"use client"  // line 1 if needed

// 1. React
import { useState, useEffect, useCallback } from 'react'

// 2. Next.js
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// 3. Third-party libraries
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// 4. UI components (shadcn/ui)
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

// 5. Internal components
import { CurrencyDisplay } from '@/components/finance/CurrencyDisplay'

// 6. Lib / utils / types
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { groupSchema, type GroupFormValues } from '@/lib/schemas/groups'
import type { Group } from '@/types'
```

---

## Props interface pattern

Define props as a named `type` above the component. Never use inline anonymous types.

```typescript
// CORRECT — named type above component
type GroupCardProps = {
  group: Group
  onEdit?: () => void
  isAdmin?: boolean
}

export function GroupCard({ group, onEdit, isAdmin = false }: GroupCardProps) {
  // ...
}

// WRONG — inline anonymous type
export function GroupCard({ group, onEdit }: { group: Group; onEdit?: () => void }) {
```

---

## i18n — useTranslations pattern (mandatory)

Never hardcode English strings in JSX. Every user-visible string goes through `t()`.

```typescript
// Server Component
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('Groups')

// Client Component
import { useTranslations } from 'next-intl'
const t = useTranslations('Groups')

// Usage
<h1>{t('title')}</h1>
<Button>{t('action.create')}</Button>
<p>{t('memberCount', { count: members.length })}</p>
```

Translation key naming convention — always match `messages/en.json` structure:
```json
{
  "Groups": {
    "title": "Groups",
    "action": {
      "create": "Create Group",
      "edit": "Edit",
      "delete": "Delete",
      "save": "Save",
      "cancel": "Cancel"
    },
    "emptyState": {
      "title": "No groups yet",
      "body": "Create your first small group to get started.",
      "action": "Create Group"
    },
    "error": {
      "load": "Failed to load groups",
      "save": "Failed to save group"
    },
    "memberCount": "{count, plural, one {# member} other {# members}}"
  }
}
```

**Always update all 3 locale files simultaneously:**
`messages/en.json` + `messages/ar.json` + `messages/ar-eg.json`

---

## RTL layout (non-negotiable)

This app is Arabic-first. RTL layout must work correctly.

**Use logical Tailwind properties — never directional ones:**

```typescript
// NEVER — breaks in RTL
className="ml-3 mr-2 pl-4 pr-2 text-left text-right"

// ALWAYS — logical properties work in both LTR and RTL
className="ms-3 me-2 ps-4 pe-2 text-start text-end"
```

**Text inputs — always `dir="auto"`:**
```typescript
<Input dir="auto" placeholder={t('namePlaceholder')} />
<Textarea dir="auto" />
```

**Currency and numbers — always `dir="ltr"`:**
```typescript
<span dir="ltr" className="font-mono">{amount.toLocaleString()}</span>
// Or use the existing CurrencyDisplay component:
<CurrencyDisplay amount={donation.amount} currency="EGP" />
```

**Flex direction in RTL:**
```typescript
// Icons and labels flip automatically with logical properties
<div className="flex items-center gap-2">
  <Icon className="size-4" />  {/* icon side is automatic */}
  <span>{t('label')}</span>
</div>
```

---

## UI components (shadcn/ui only)

Only use components from `components/ui/`. Do not install new UI libraries.

Available: `button`, `card`, `dialog`, `input`, `label`, `select`, `checkbox`, `avatar`,
`dropdown-menu`, `alert-dialog`, `popover`, `separator`, `slot`, `switch`, `tabs`,
`badge`, `skeleton`, `textarea`, `form`, `table`, `toast` (via sonner).

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
```

---

## Loading states (mandatory on every data-dependent component)

Every page must have a sibling `loading.tsx`. Every list component must have a skeleton.

```typescript
// app/(app)/admin/groups/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Card>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
```

Loading skeleton rules:
- Match the real layout as closely as possible (same number of rows, same rough dimensions)
- Use `Skeleton` component from `components/ui/skeleton`
- Add `pb-20 md:pb-0` on mobile to account for bottom navigation

---

## Empty states (mandatory on every list component)

Every list must handle the empty case with a helpful message and a call to action.

```typescript
if (!groups || groups.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Users className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{t('emptyState.title')}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        {t('emptyState.body')}
      </p>
      {canCreate && (
        <Button asChild>
          <Link href="/admin/groups/new">{t('emptyState.action')}</Link>
        </Button>
      )}
    </div>
  )
}
```

---

## Error feedback (mandatory on all forms)

Every form submission must show feedback. Use `sonner` toast.

```typescript
import { toast } from 'sonner'

// Success
toast.success(t('saved'))

// Error — never show raw error messages to users
toast.error(t('error.save'))

// With description
toast.error(t('error.save'), {
  description: t('error.tryAgain'),
})
```

---

## Mobile-first layout (target: 360-390px)

```typescript
// Cards on mobile, table on desktop
<div className="md:hidden space-y-3">
  {groups.map(group => <GroupCard key={group.id} group={group} />)}
</div>
<div className="hidden md:block">
  <GroupsTable groups={groups} />
</div>

// Touch targets — minimum 44px (h-11) on all interactive elements
<Button className="h-11">...</Button>
<Link className="flex items-center h-11 px-4">...</Link>

// Bottom nav spacing on mobile
<div className="pb-20 md:pb-0">
  {/* page content */}
</div>

// Full-width buttons on mobile
<Button className="w-full md:w-auto">
  {t('action.save')}
</Button>
```

---

## Form pattern (react-hook-form + Zod)

```typescript
"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from '@/components/ui/form'

const schema = z.object({
  name: z.string().min(1, { message: 'Required' }).max(100),
  name_ar: z.string().min(1, { message: 'مطلوب' }).max(100),
})
type FormValues = z.infer<typeof schema>

export function GroupForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const t = useTranslations('Groups')
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: '', name_ar: '' },
  })

  const onSubmit = async (values: FormValues) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed')
      }
      toast.success(t('saved'))
      router.push('/admin/groups')
      router.refresh()
    } catch {
      toast.error(t('error.save'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.name')}</FormLabel>
              <FormControl>
                <Input {...field} dir="auto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.nameAr')}</FormLabel>
              <FormControl>
                <Input {...field} dir="auto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full"
        >
          {isSubmitting ? t('saving') : t('action.save')}
        </Button>
      </form>
    </Form>
  )
}
```

---

## useEffect with fetch — always with AbortController

```typescript
useEffect(() => {
  const controller = new AbortController()

  const load = async () => {
    try {
      const res = await fetch(`/api/groups/${id}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setGroup(data.group)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      toast.error(t('error.load'))
    } finally {
      setLoading(false)
    }
  }

  load()
  return () => controller.abort()
}, [id])
```

---

## Analytics pattern

```typescript
import { trackEvent } from '@/lib/analytics/events'

// Always use the typed event catalog — never raw posthog.capture()
await trackEvent('group_created', {
  churchId,
  groupType: group.type,
})
```

---

## Anti-patterns — never copy these

1. Hardcoded English in JSX — `<h1>Members</h1>` → always `<h1>{t('title')}</h1>`
2. `ml-`, `mr-`, `pl-`, `pr-` classes — use `ms-`, `me-`, `ps-`, `pe-`
3. Missing `dir="auto"` on text inputs
4. Missing loading state on data-dependent component
5. Missing empty state on list component
6. No toast on form submit failure
7. No submission guard on forms — button always enabled
8. fetch() inside useEffect without AbortController cleanup
9. New UI components not from `components/ui/`
10. Inline styles — use Tailwind classes