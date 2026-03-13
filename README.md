# Ekklesia — Church Management Platform

A comprehensive church management platform built for Arabic-speaking churches (primarily Egypt). Handles member management, visitor tracking, group/ministry coordination, events, serving, finance, Bible reading, notifications, announcements, songs/worship, outreach, and prayer requests.

**Status:** Pre-launch. Deployed to Vercel for testing.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + shadcn/ui |
| i18n | next-intl (Arabic primary + English) |
| Push | Firebase Cloud Messaging |
| Analytics | PostHog |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase CLI (optional, for local development)

### Setup
1. Clone the repository
2. Copy environment variables: `cp .env.example .env.local`
3. Fill in your Supabase, Firebase, and other credentials
4. Install dependencies: `npm install`
5. Run development server: `npm run dev`

### Environment Variables
See `.env.example` for all required and optional variables with descriptions.

## Development

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build (must pass with 0 TS errors)
npx tsc --noEmit     # Type check only
npm run generate:sw  # Generate Firebase service worker
```

## Architecture

- **Multi-tenant**: Every query filters by `church_id`
- **RTL-first**: Arabic is the primary language, all layouts use logical properties
- **Mobile-first**: Target device is budget Android on 3G
- **API routes**: Centralized `apiHandler` wrapper for auth, roles, permissions
- **Validation**: Zod schemas for all API inputs

See `CLAUDE.md` for full architecture documentation.

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Full access |
| `ministry_leader` | Admin-level operations |
| `group_leader` | Small group management |
| `member` | Basic features |

## Project Structure

```
app/          # Next.js pages and API routes
components/   # React components by module
lib/          # Core utilities, auth, API handler, schemas
types/        # TypeScript type definitions
messages/     # i18n translations (en, ar, ar-eg)
supabase/     # Database migrations and seeds
```

## Contributing

1. Read `CLAUDE.md` for project conventions
2. Ensure `npx tsc --noEmit` passes before committing
3. No hardcoded English strings — use `useTranslations()` / `getTranslations()`
4. No `ml-`, `mr-`, `text-left`, `text-right` — use RTL logical properties
5. Every new page needs a `loading.tsx`
