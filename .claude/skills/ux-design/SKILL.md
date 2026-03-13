---
name: ekklesia-ux-design
description: Senior UX designer patterns and standards for the Ekklesia church management app. Read this skill before designing or building any UI feature, reviewing existing screens for UX problems, making layout decisions, choosing component patterns, or writing any code that users will interact with. Use whenever an agent is building a new page, form, list, dashboard, or interactive element — especially before writing any JSX or Tailwind classes.
---

# Ekklesia UX Design System

## Before You Start

1. Read `CLAUDE.md` — understand the users, the device constraints, the roles, the cultural context.
2. Read this skill completely before writing a single JSX element.
3. Look at existing components before inventing new patterns.

---

## Who You Are Designing For

This is the most important section. Everything else flows from here.

### The User

**Primary user:** A church member or leader in an Arabic-speaking community, most likely Egypt. They are on a budget Android phone — a Samsung Galaxy A-series or similar. The screen is 360-390px wide. The connection is 3G or spotty 4G. They are not a "tech user" — they use WhatsApp daily and are comfortable with it, but they may have never used a web app this complex.

**Secondary user:** A church administrator (ministry leader, super admin) who manages the church. They may be on a desktop for admin tasks but switch to mobile for quick actions.

**What this means for design:**
- Every tap target must be large enough to hit with a thumb, never a precise fingertip
- Information must be scannable — they will not read paragraph text
- Actions must be obvious — no hidden gestures, no ambiguous icons without labels
- Loading states matter more than on desktop — 3G makes every second felt
- Error messages must be human and kind — this is a community app, not a banking app

### The Context

**Church community:** People are using this app in the context of their faith community — gatherings, prayer, giving, serving. The tone must be warm, trustworthy, and respectful. Never clinical. Never cold. Never corporate.

**Arabic is primary:** The interface is used in Arabic most of the time. RTL is not an afterthought — it is the primary direction. Design for RTL first, then verify LTR works.

**Sensitive data:** Finance, attendance, personal milestones — this data is personal. Empty states and error states should be reassuring, not alarming.

---

## Design Principles

### 1. Clarity over cleverness
Every screen should answer "what can I do here?" in under 2 seconds. If it takes longer, the layout is wrong.

### 2. Thumb-first
Design for one-handed use. Primary actions bottom-right (or bottom-center). Secondary actions reachable. Destructive actions behind confirmation.

### 3. Progressive disclosure
Don't show everything at once. Show the list first, details on tap. Show summary first, breakdown on expand. Use sheets and drawers for secondary content rather than new pages.

### 4. Warmth without sentimentality
Use warm neutrals (zinc, stone, warm grays) not cold blues or clinical whites. Use color purposefully — primary color for primary actions, not decoration.

### 5. Respect for 3G
Every screen must be useful within 1 second of arriving (skeleton), fully loaded within 3 seconds, and functional offline for read operations (via PWA cache).

### 6. RTL-native, not RTL-patched
Design the layout in RTL first. Arabic text, Arabic names, Arabic numbers where appropriate. Never "flip" an LTR design — start from RTL and adapt LTR.

---

## Layout Patterns

### Page anatomy

```
┌─────────────────────────┐
│ Topbar (fixed, 56px)    │  Title + optional action button
├─────────────────────────┤
│                         │
│ Content area            │  Scrollable, p-4 mobile / p-6 desktop
│                         │
│                         │
│                         │
├─────────────────────────┤
│ Bottom Nav (fixed, 56px)│  5 tabs max
└─────────────────────────┘
```

**Content area padding:** `px-4 py-4 md:px-6 md:py-6`
**Safe area:** Always account for bottom nav — add `pb-24` or `pb-20` to scrollable content

### List pages

Always follow this hierarchy:
1. **Page header** — title + primary CTA (e.g., "+ Add Donation")
2. **Filter/search bar** — if the list has >10 potential items
3. **Summary stats** — optional, 2-4 key numbers above the list
4. **The list** — card-based on mobile, table on desktop (md:)
5. **Empty state** — when no items

```tsx
// List page structure
<div className="min-h-screen pb-24">
  {/* Header */}
  <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6">
    <h1 className="text-xl font-semibold text-zinc-900">{t('page.title')}</h1>
    <Button size="sm">
      <Plus className="h-4 w-4 me-1.5" />
      {t('action.add')}
    </Button>
  </div>

  {/* Optional: filter bar */}
  <div className="px-4 pb-3 md:px-6">
    <SearchInput />
  </div>

  {/* List content */}
  <div className="px-4 md:px-6">
    {items.length === 0 ? <EmptyState /> : <ItemList items={items} />}
  </div>
</div>
```

### Detail pages

```
┌─────────────────────────┐
│ ← Back    [Title]   ⋯  │  Back button + title + overflow menu
├─────────────────────────┤
│ Hero section (optional) │  Key stat or image
├─────────────────────────┤
│ Info card               │  Primary details
├─────────────────────────┤
│ Section header          │
│ Related list            │
├─────────────────────────┤
│ [Primary Action Button] │  Sticky if critical
└─────────────────────────┘
```

### Form pages

Forms are high-friction. Every field must earn its place.

```
┌─────────────────────────┐
│ ← Cancel   [Title]  ✓  │  Cancel left, Save/Submit right
├─────────────────────────┤
│ Section label           │
│ ┌─────────────────────┐ │
│ │ Field               │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Field               │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Section label           │
│ ...                     │
├─────────────────────────┤
│ [Submit Button - full]  │  Full width at bottom
└─────────────────────────┘
```

Form rules:
- Group related fields with a section label (`text-xs font-medium text-zinc-500 uppercase tracking-wide`)
- Never more than 2 fields per row on mobile (prefer 1)
- Label above field, never placeholder-as-label
- Inline error below the field, immediate (on blur, not on submit)
- Required fields — don't use asterisks, use "(optional)" on optional fields instead
- Submit button: full width on mobile, auto on desktop, disabled while submitting

---

## Component Patterns

### Cards (list items)

```tsx
// Standard list card — mobile
<div className="flex items-center gap-3 py-3.5 px-4 border-b border-zinc-100 last:border-0 active:bg-zinc-50 transition-colors">
  {/* Leading: avatar or icon */}
  <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
    <span className="text-sm font-medium text-zinc-600">{initials}</span>
  </div>

  {/* Content */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-zinc-900 truncate">{name}</p>
    <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
  </div>

  {/* Trailing: badge or value or chevron */}
  <div className="shrink-0 flex items-center gap-2">
    <span className="text-sm font-medium text-zinc-900">{value}</span>
    <ChevronRight className="h-4 w-4 text-zinc-400 rtl:rotate-180" />
  </div>
</div>
```

**Card height:** Minimum 56px (touch target). Prefer 64-72px for cards with two lines of text.

### Status badges

Use semantic colors consistently across the entire app:

```tsx
const statusStyles = {
  // Positive / success states
  active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  present:   'bg-emerald-50 text-emerald-700 border border-emerald-200',

  // Neutral / in-progress states
  pending:    'bg-amber-50 text-amber-700 border border-amber-200',
  assigned:   'bg-blue-50  text-blue-700  border border-blue-200',
  inProgress: 'bg-blue-50  text-blue-700  border border-blue-200',
  draft:      'bg-zinc-100 text-zinc-600  border border-zinc-200',

  // Negative states
  absent:    'bg-red-50   text-red-700   border border-red-200',
  failed:    'bg-red-50   text-red-700   border border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-500  border border-zinc-200',
  lost:      'bg-zinc-100 text-zinc-500  border border-zinc-200',

  // Special
  excused:   'bg-purple-50 text-purple-700 border border-purple-200',
  new:       'bg-sky-50    text-sky-700    border border-sky-200',
}

// Badge component
<span className={cn(
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  statusStyles[status]
)}>
  {t(`status.${status}`)}
</span>
```

**Rule:** Never use raw color names in badge logic — always go through the status map. This ensures consistency across the entire app.

### Empty states

Empty states are moments of opportunity, not failure. Every empty state must:
1. Explain what goes here (not just "No items")
2. Give a direct action to fix the emptiness (when the user can create)
3. Use a warm, encouraging tone

```tsx
<div className="flex flex-col items-center justify-center py-16 px-8 text-center">
  {/* Illustration or icon */}
  <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
    <Icon className="h-8 w-8 text-zinc-400" />
  </div>

  {/* Heading */}
  <h3 className="text-base font-semibold text-zinc-900 mb-1">
    {t('emptyState.title')}   {/* "No donations yet" */}
  </h3>

  {/* Explanation */}
  <p className="text-sm text-zinc-500 mb-6 max-w-[260px]">
    {t('emptyState.body')}   {/* "Donations you record will appear here." */}
  </p>

  {/* Action (only if user can create) */}
  {canCreate && (
    <Button size="sm">
      <Plus className="h-4 w-4 me-1.5" />
      {t('emptyState.action')}   {/* "Record first donation" */}
    </Button>
  )}
</div>
```

### Stat cards (dashboard)

```tsx
<div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-1">{t('stat.label')}</p>
      <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
      {trend && (
        <p className="text-xs text-zinc-400 mt-0.5">{trend}</p>
      )}
    </div>
    <div className="h-9 w-9 rounded-xl bg-zinc-50 flex items-center justify-center">
      <Icon className="h-5 w-5 text-zinc-500" />
    </div>
  </div>
</div>
```

### Sheet / bottom drawer (mobile modal)

Use for: filters, quick actions, confirmation dialogs, secondary forms.
Never use a full page for something that fits in a sheet.

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="h-4 w-4 me-1.5" />
      {t('action.filter')}
    </Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="rounded-t-2xl pb-8">
    <SheetHeader className="mb-4">
      <SheetTitle>{t('filter.title')}</SheetTitle>
    </SheetHeader>
    {/* Filter content */}
  </SheetContent>
</Sheet>
```

### Confirmation dialogs

Destructive actions (delete, remove, cancel) always require confirmation.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">
      {t('action.delete')}
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('confirm.deleteTitle')}</AlertDialogTitle>
      <AlertDialogDescription>{t('confirm.deleteBody')}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700">
        {t('action.delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Typography Scale

Use only these text sizes. Do not invent new ones.

```
text-xs     (12px) — labels, captions, timestamps, badges
text-sm     (14px) — body text, list items, form labels, secondary content
text-base   (16px) — default, form inputs (REQUIRED for iOS zoom prevention)
text-lg     (18px) — section headings, card titles when prominent
text-xl     (20px) — page titles on mobile
text-2xl    (24px) — page titles on desktop, large stats
text-3xl+   (30px+) — hero stats only (e.g., monthly total on finance dashboard)
```

Font weight conventions:
```
font-normal   (400) — body copy, secondary text
font-medium   (500) — list item titles, labels, UI text
font-semibold (600) — page titles, section headers, card headings
font-bold     (700) — large numbers, key stats
```

---

## Color Usage

The app uses zinc as the primary neutral scale. Do not introduce other neutral scales.

```
zinc-900  — primary text (headings, important values)
zinc-700  — secondary text (descriptions, subtitles)
zinc-500  — tertiary text (labels, timestamps, placeholder)
zinc-400  — disabled text, decorative icons
zinc-200  — borders (subtle)
zinc-100  — backgrounds (cards, inputs, skeleton)
zinc-50   — hover states, very subtle backgrounds
white     — card surfaces, modals

Primary action color: [read from tailwind.config / CSS variables]
Destructive: red-600 (buttons), red-50/red-700 (badges/text)
```

**Currency amounts:** Always `dir="ltr"` and `font-variant-numeric: tabular-nums`. Use `tabular-nums` class.

---

## Spacing System

Use only Tailwind's default scale. Common values:

```
Padding inside cards:     p-4 (mobile), p-5 (desktop)
Gap between list items:   divide-y divide-zinc-100 (preferred) or gap-2
Gap between form fields:  space-y-4
Gap between sections:     space-y-6 or space-y-8
Page horizontal padding:  px-4 (mobile), px-6 (desktop)
Page top padding:         pt-4 (below topbar)
Page bottom padding:      pb-24 (above bottom nav)
Icon size in buttons:     h-4 w-4
Icon size standalone:     h-5 w-5
Avatar size (small):      h-8 w-8
Avatar size (medium):     h-10 w-10
Avatar size (large):      h-12 w-12
Touch target minimum:     h-11 (44px) or h-12 (48px)
```

---

## Touch & Interaction

### Touch targets
- All interactive elements: minimum `h-11` (44px) height
- List items that navigate: full-width touch area, not just the text
- Icon buttons: `h-9 w-9` minimum with `p-2` padding

### Feedback states
Every interactive element needs visual feedback:
```tsx
// Tap feedback on list items
className="active:bg-zinc-50 transition-colors duration-100"

// Button loading state
<Button disabled={isPending}>
  {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
  {t('action.save')}
</Button>

// Optimistic updates: update UI immediately, rollback on error
// Never make users wait for the server to see their action reflected
```

### Swipe and gesture
Do not implement custom swipe gestures except where already established (SwipeAttendance). Gestures are undiscoverable and inconsistent across devices.

---

## Arabic / RTL Design Patterns

### Text alignment
- Body text: `text-start` (auto-aligns based on dir)
- Numbers and currency: always `dir="ltr"` — numbers don't mirror
- Mixed content (name + amount): wrap amount in `<span dir="ltr">`

### Icon mirroring
Directional icons must mirror in RTL:
```tsx
// These always need rtl:rotate-180:
<ChevronRight className="rtl:rotate-180" />
<ChevronLeft className="rtl:rotate-180" />
<ArrowRight className="rtl:rotate-180" />
<ArrowLeft className="rtl:rotate-180" />

// These do NOT mirror (they're not directional):
<Plus /> <X /> <Check /> <Search /> <Bell /> <Heart />
```

### Arabic name display
When showing names, always prefer Arabic if the user's locale is Arabic:
```tsx
const displayName = locale === 'ar' || locale === 'ar-eg'
  ? (member.first_name_ar && member.last_name_ar
      ? `${member.first_name_ar} ${member.last_name_ar}`
      : `${member.first_name} ${member.last_name}`)
  : `${member.first_name} ${member.last_name}`
```

### Input fields
All text inputs must have `dir="auto"`:
```tsx
<input dir="auto" className="text-base ..." />
// text-base (16px) prevents iOS zoom on focus
```

---

## Loading & Skeleton States

Every page must feel fast even on 3G.

### Skeleton anatomy
Skeletons must match the real layout exactly — same heights, same spacing, same number of rows. A skeleton that's wrong causes layout shift when content arrives.

```tsx
// Correct skeleton for a list card
<div className="flex items-center gap-3 py-3.5 px-4 border-b border-zinc-100">
  <div className="h-10 w-10 rounded-full bg-zinc-100 animate-pulse shrink-0" />
  <div className="flex-1 space-y-1.5">
    <div className="h-4 w-32 bg-zinc-100 animate-pulse rounded" />
    <div className="h-3 w-20 bg-zinc-100 animate-pulse rounded" />
  </div>
  <div className="h-5 w-14 bg-zinc-100 animate-pulse rounded-full shrink-0" />
</div>
```

Use `animate-pulse` (not `animate-spin` or custom animations). Keep skeleton the same tone as real content — `bg-zinc-100` on white backgrounds.

### Optimistic UI
For mutations (create, update, delete), update the UI immediately and rollback if the server returns an error. Never make the user wait for a round trip to see their action reflected.

---

## Error States

### Form validation errors
```tsx
// Inline, immediate (on blur), below the field
<p className="text-xs text-red-600 mt-1">{error.message}</p>
```

### API errors (toast)
Use toast for non-blocking errors (e.g., "Failed to save. Try again."):
```tsx
toast.error(t('error.saveFailed'))
```

### Page-level errors (error boundary)
For catastrophic failures, show a recovery page — not a raw error. Always include a "Try again" button and a way to go home.

### Network errors
The app is PWA-enabled. When offline, the `OfflineBanner` component shows. Do not add additional offline handling unless you're building a feature that requires offline write capability.

---

## UX Review Checklist

When reviewing any feature or screen, check every item:

### Information architecture
- [ ] Can a new user understand what this page does in 2 seconds?
- [ ] Is the page title clear and translated?
- [ ] Are the most important actions visible without scrolling?
- [ ] Is there an empty state that guides the user forward?
- [ ] Is there a loading state (skeleton) that matches the layout?

### Visual hierarchy
- [ ] Is there a clear primary action (one, not three)?
- [ ] Is the typography scale used correctly (no font-size invention)?
- [ ] Are status colors consistent with the status map?
- [ ] Is spacing consistent with the spacing system?
- [ ] Are destructive actions visually distinct (red)?

### Mobile / touch
- [ ] All touch targets >= 44px?
- [ ] Tables have mobile card fallback?
- [ ] Content doesn't overflow at 360px?
- [ ] Bottom padding accounts for nav bar (pb-24)?
- [ ] No horizontal scroll on mobile?
- [ ] Tap feedback on interactive elements?

### RTL / Arabic
- [ ] All Tailwind classes use logical properties (ms, me, ps, pe, text-start, text-end)?
- [ ] Directional icons have rtl:rotate-180?
- [ ] Inputs have dir="auto"?
- [ ] Currency amounts have dir="ltr"?
- [ ] Arabic names display when locale is Arabic?

### Accessibility
- [ ] All interactive elements have accessible labels?
- [ ] Color is not the only way to convey status (icon or text too)?
- [ ] Form fields have associated labels (not just placeholder)?
- [ ] Destructive actions behind confirmation?
- [ ] Loading states communicated (aria-live or visual)?

### i18n
- [ ] All strings through useTranslations / getTranslations?
- [ ] All three translation files updated (en, ar, ar-eg)?
- [ ] No hardcoded English in JSX?

---

## What to Produce

When called for a UX review, produce:
1. A prioritized table of issues (Critical / High / Medium / Low)
2. Exact JSX/Tailwind fixes for each issue (not descriptions — actual code)
3. A before/after summary

When called before building a feature, produce:
1. A screen-by-screen design spec (what pages exist, what each shows)
2. The component hierarchy (which components to build/reuse)
3. The data requirements (what queries are needed)
4. The empty/loading/error states for each screen
5. The translation keys needed
6. Specific JSX patterns to use (from this skill) for each UI element
