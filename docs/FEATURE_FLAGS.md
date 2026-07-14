# Feature Flags Reference

Everything about Ekklesia's feature-flag system, grounded in `lib/features.ts`, `middleware.ts`, and `lib/navigation.ts`. When this doc and the code disagree, **trust the code**.

---

## The system in one paragraph

Flags are defined as a TypeScript union (`FeatureFlag`) with hardcoded defaults (`DEFAULT_FLAGS`) in `lib/features.ts`. A synchronous check (`isFeatureEnabled`) layers **environment-variable overrides** on top of those defaults — this is what `middleware.ts` and `lib/navigation.ts` call to gate routes and nav. A separate asynchronous check (`isFeatureEnabledForChurch`) additionally consults the per-church `church_features` table so a flag can be turned on/off **per church**. There is no admin UI for flags today — you flip them with env vars (global) or `church_features` rows (per church).

---

## Every flag

Source of truth: `DEFAULT_FLAGS` in `lib/features.ts`.

| Flag | Default | What it gates | Where it's enforced |
|------|---------|---------------|---------------------|
| `advanced_reporting` | **off** | Advanced reporting surfaces (reserved; no dedicated middleware/nav gate today). | Defaults only. |
| `sms_notifications` | **off** | SMS notification channel (reserved). | Defaults only. |
| `api_access` | **off** | External/public API access (reserved). | Defaults only. |
| `custom_fields` | **off** | Custom fields (reserved). | Defaults only. |
| `audit_log_ui` | **off** | Audit-log admin UI (reserved). | Defaults only. |
| `outreach_module` | **on** | Outreach module surfaces. | Default-on; no explicit middleware/nav `feature` gate — reachable by default. |
| `song_presenter` | **on** | Song presenter surfaces. | Default-on; reachable by default. |
| `liturgy_module` | **on** | Liturgy module surfaces. | Default-on; reachable by default. |
| `finance` | **off** | Entire finance surface: `/admin/finance/*` pages, `/finance/my-giving`, all `/api/finance/*`, and the Finance / My Giving / Reports nav items. | **Middleware** redirect (pages) / 404 (API) + **nav** `feature: 'finance'` on 3 items. See finance section. |
| `templates` | **off** | Event-template surface: `/admin/templates*`, `/admin/events/from-template`, `/api/templates*`, `/api/events/from-template`, and the Templates nav item. | **Middleware** redirect/404 + **nav** `feature: 'templates'`. See templates section. |

> Note: the several default-`off` flags (`advanced_reporting`, `sms_notifications`, `api_access`, `custom_fields`, `audit_log_ui`) are declared for future use and are **not** wired into any middleware or nav gate in the current code — flipping them on has no visible effect until code references them. Only `finance` and `templates` are actively enforced gates today; `outreach_module`, `song_presenter`, and `liturgy_module` default on and their modules ship live.

---

## The two functions

### `isFeatureEnabled(flag)` — synchronous, env + defaults

```ts
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`
  if (process.env[envKey] === 'true') return true
  if (process.env[envKey] === 'false') return false
  return DEFAULT_FLAGS[flag]
}
```

- Resolution order: **env override → hardcoded default**.
- The env var is `NEXT_PUBLIC_FEATURE_<FLAG_UPPERCASED>` — e.g. `finance` → `NEXT_PUBLIC_FEATURE_FINANCE`, `templates` → `NEXT_PUBLIC_FEATURE_TEMPLATES`.
- Because it's a `NEXT_PUBLIC_*` var it's baked into the client bundle at build time — **changing it requires a redeploy**, not just a runtime restart.
- This is the function used by `middleware.ts` and `lib/navigation.ts` (both are global, not per-church).

### `isFeatureEnabledForChurch(supabase, flag, churchId)` — async, per-church DB

```ts
export async function isFeatureEnabledForChurch(supabase, flag, churchId): Promise<boolean> {
  if (isFeatureEnabled(flag) && DEFAULT_FLAGS[flag]) return true   // env/default short-circuit
  const { data } = await supabase
    .from('church_features')
    .select('enabled')
    .eq('church_id', churchId)
    .eq('feature', flag)
    .single()
  return data?.enabled ?? DEFAULT_FLAGS[flag]                       // row wins, else default
}
```

- Use this when you want a flag controlled **per church** rather than globally.
- Resolution: if the flag is on by default/env it short-circuits to `true`; otherwise it reads the church's `church_features` row (`enabled`), falling back to the hardcoded default when there's no row. Any error falls back to the default (fails safe).
- Accepts a structural `Pick<SupabaseClient, 'from'>` so tests can pass a mock.

---

## Finance is OFF — the story

**Why:** Finance is treated as in-development. It is fully built (full double-entry system) but has deeper schema/code drift — per `CLAUDE.md`, budget creation and double-entry transactions still fail. Nothing about finance should be assumed to work.

**What's gated (in `middleware.ts`):** when `isFeatureEnabled('finance')` is false, any request whose path starts with `/admin/finance`, `/finance/my-giving`, or `/api/finance` is blocked:
- `/api/finance/*` → `404 { error: 'Not found' }`.
- pages → redirect to `/dashboard` (if a session exists) or `/login`.

**Nav:** the `Finance`, `My Giving`, and `Reports` items carry `feature: 'finance'`, so `getNavForUser` drops them when the flag is off.

**How to re-enable:** set `NEXT_PUBLIC_FEATURE_FINANCE=true` (globally) and redeploy — but only after the finance schema/code drift is reconciled. Per-church enablement via `church_features` can layer on later (note: the middleware/nav gate uses the sync/global check, so it must go on globally first for the surface to be reachable at all).

---

## Templates are OFF — the story

**Why:** Event templates are gated OFF in production until the module is pilot-ready. Same treatment as finance.

**What's gated (in `middleware.ts`):** when `isFeatureEnabled('templates')` is false, paths starting with `/admin/templates`, `/admin/events/from-template`, `/api/templates`, or `/api/events/from-template` are blocked (API → 404, pages → redirect to `/dashboard` or `/login`).

**Nav:** the `Templates` item carries `feature: 'templates'` and is dropped when off.

**How to re-enable:** set `NEXT_PUBLIC_FEATURE_TEMPLATES=true` (set on staging/local per the code comment) and redeploy.

---

## How nav gating works

`lib/navigation.ts` — each `NavItem` may declare an optional `feature: FeatureFlag`. `getNavForUser()` filters an item out unless **all** of these pass:

1. `item.roles.includes(role)`
2. `item.permission` is absent OR the resolved permission is `true`
3. `item.feature` is absent OR `isFeatureEnabled(item.feature)` is `true`

So a nav item can be hidden by role, by permission, or by feature flag independently. Today only `finance` (Finance, My Giving, Reports) and `templates` (Templates) items are feature-gated.

---

## How to add a new flag

1. **Declare it** in the `FeatureFlag` union in `lib/features.ts`:
   ```ts
   export type FeatureFlag =
     | 'advanced_reporting'
     | /* … */
     | 'my_new_flag'
   ```
2. **Add a default** in `DEFAULT_FLAGS` (pick `false` if you want it dark in prod until ready):
   ```ts
   const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
     // …
     my_new_flag: false,
   }
   ```
3. **Gate the surface.** Choose where it matters:
   - **Routes** — add a block in `middleware.ts` mirroring the finance/templates gates (redirect pages, 404 for `/api/*`) guarded by `!isFeatureEnabled('my_new_flag')`.
   - **Nav** — add `feature: 'my_new_flag'` to the relevant `NAV_ITEMS` entries in `lib/navigation.ts`.
   - **In-component / server checks** — call `isFeatureEnabled('my_new_flag')` (global) or `isFeatureEnabledForChurch(supabase, 'my_new_flag', churchId)` (per church) where you branch.
4. **Toggle it.** Globally via `NEXT_PUBLIC_FEATURE_MY_NEW_FLAG=true|false` (redeploy required — it's a `NEXT_PUBLIC_*` build-time var). Per church via a `church_features` row (`church_id`, `feature = 'my_new_flag'`, `enabled`) read through `isFeatureEnabledForChurch`.
5. Keep the `DEFAULT_FLAGS` record exhaustive — it's typed `Record<FeatureFlag, boolean>`, so TypeScript forces every union member to have a default.

---

## Quick reference

| Task | Do this |
|------|---------|
| Turn a flag on globally | Set `NEXT_PUBLIC_FEATURE_<NAME>=true`, redeploy |
| Turn a flag off globally | Set `NEXT_PUBLIC_FEATURE_<NAME>=false`, redeploy (or rely on default) |
| Turn a flag on for one church | Insert/update a `church_features` row and read via `isFeatureEnabledForChurch` (the code path must use the async check, not the sync one) |
| Check a flag in middleware/nav | `isFeatureEnabled(flag)` (sync, global) |
| Check a flag per church in a server component / route | `isFeatureEnabledForChurch(supabase, flag, churchId)` (async) |
