#!/usr/bin/env bash
# Run the Next.js dev server against the STAGING Supabase project.
# Process env set here OVERRIDES .env.local (Next.js gives real env priority), so the
# prod-pointing .env.local stays untouched while everything Supabase points at staging.
set -euo pipefail
cd "$(dirname "$0")/.."

# Load staging credentials (gitignored)
set -a
source .env.staging
set +a

export NEXT_PUBLIC_SUPABASE_URL          # from .env.staging
export NEXT_PUBLIC_SUPABASE_ANON_KEY
export SUPABASE_SERVICE_ROLE_KEY
export DATABASE_URL="$STAGING_DB_URL"
export NEXT_PUBLIC_APP_URL="http://localhost:3100"
export PLATFORM_ADMIN_EMAILS="platform@staging.test"
export APP_ENV="staging"
# Feature flags — default off in prod; enabled on staging for testing
export NEXT_PUBLIC_FEATURE_TEMPLATES="true"

echo "▶ dev server → STAGING ($STAGING_PROJECT_REF) on :3100"
npm run generate:sw
NODE_OPTIONS='--no-experimental-webstorage' exec npx next dev --turbopack -p 3100
