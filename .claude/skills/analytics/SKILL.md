---
name: ekklesia-analytics
description: PostHog analytics instrumentation standards for the Ekklesia app. Read this skill before building any feature that involves user actions, form submissions, navigation, or data creation. Use whenever an agent is adding buttons, forms, page loads, or any user-facing interaction — analytics instrumentation is part of the definition of done for every feature, not an afterthought.
---

# Ekklesia Analytics

## The rule

**Analytics is part of done.** Every feature is incomplete without instrumentation.
A button with no tracking is invisible to the product team.
A form submission with no event cannot be analyzed.
A page with no pageview event cannot be measured for drop-off.

---

## Import pattern

Always import from the event catalog. Never call `posthog.capture()` directly.

```ts
import { analytics } from '@/lib/analytics'

// Correct
analytics.finance.donationRecorded({ ... })

// Wrong — invents event names, skips type safety
posthog.capture('donation_recorded', { ... })
```

---

## When to track

| User action | Track it? | Event to use |
|-------------|-----------|-------------|
| Page load | Always | Auto-captured by PostHogPageView component |
| Form submitted successfully | Always | Module-specific event (e.g., `analytics.finance.donationRecorded`) |
| Primary CTA clicked (that navigates) | Yes | nav event or module event |
| Destructive action confirmed | Yes | `[module]_[object]_deleted` (add to catalog if missing) |
| Filter/search applied | Only for key features | Add to catalog if it's a core workflow |
| Modal/sheet opened | No | Too noisy |
| Every keystroke | Never | PII risk + noise |
| Form field focus/blur | No | Noise |
| Hover states | Never | Meaningless on mobile |

---

## When to track — timing

```ts
// Track AFTER confirmed success
const result = await createDonation(data)
if (result.success) {
  analytics.finance.donationRecorded({ ... })
}

// Never track on attempt (before server confirms)
analytics.finance.donationRecorded({ ... })  // then await...
```

---

## Required properties on every event

```ts
{
  church_id: string,  // from profile.church_id
  role: string,       // from profile.role
  locale: string,     // from useLocale() or locale cookie
}
```

## Forbidden properties (PII — never send)

```ts
// NEVER include these in any PostHog event:
name, first_name, last_name, first_name_ar, last_name_ar,
email, phone, address, photo_url
// IDs are fine (UUIDs are opaque without DB access)
```

---

## Adding a new event

When your feature needs a new event not in the catalog:

1. Open `lib/analytics/events.ts`
2. Add the event function to the correct module namespace
3. Follow the naming convention: `{module}_{action}_{object}` in past tense
4. Include BaseProperties + feature-specific props
5. Add amount/currency for any financial event
6. Never include PII

```ts
// Example: adding a new event for pledge creation
pledge: {
  created: (props: BaseProperties & {
    amount: number
    currency: string
    campaign_id: string
    frequency: 'one_time' | 'monthly' | 'weekly'
  }) => {
    posthog.capture('finance_pledge_created', props)
  },
},
```

---

## Client vs server tracking

- **Client-side** (preferred for user actions): clicks, form submits, navigation
- **Server-side** (for background events): cron jobs, webhooks, automated processes

```ts
// Server-side pattern (API routes)
import { getPostHogServer } from '@/lib/analytics/posthog-server'

const ph = getPostHogServer()
if (ph) {
  ph.capture({
    distinctId: user.id,
    event: 'finance_donation_recorded',
    properties: { church_id, role, amount, currency },
  })
  await ph.shutdown()
}
```

---

## Checklist before marking a feature done

- [ ] Every primary CTA has an analytics call on success
- [ ] Every form submission tracked after confirmed success
- [ ] Page load tracked (automatic via PostHogPageView — verify provider is in layout)
- [ ] No PII in any event properties
- [ ] New events added to catalog (`lib/analytics/events.ts`), not inline
- [ ] Events fire in the right order (after success, not on attempt)
