#!/usr/bin/env node
/**
 * Apply all supabase/migrations/*.sql to the STAGING database, in lexicographic order
 * (matches the documented ordering: 032_ < 032b_, 033_ < 033b_).
 *
 *   node scripts/apply-migrations-staging.mjs            # apply everything
 *   node scripts/apply-migrations-staging.mjs --from 087 # apply only >= prefix
 *
 * Reads STAGING_DB_URL from .env.staging. Guarded: refuses to run against prod.
 */
import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { assertNotProd } from './lib/db-guard.mjs'

const env = Object.fromEntries(
  readFileSync('.env.staging', 'utf8').split('\n').filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
)
const url = env.STAGING_DB_URL
if (!url) { console.error('STAGING_DB_URL not in .env.staging'); process.exit(2) }
assertNotProd(url)

const fromArg = process.argv.indexOf('--from')
const from = fromArg > -1 ? process.argv[fromArg + 1] : ''

// Seed-data migrations that assume pre-existing seeded users and fail on a clean rebuild.
// They carry NO schema — safe to skip; real staging test data is seeded separately.
const SKIP = new Set([
  '036_seed_church_needs_test_data.sql',
  '040_recreate_seed_users.sql',
  '042_new_test_churches_and_needs.sql',
])

const files = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
  .filter(f => f >= from)

const db = new pg.Client({ connectionString: url })
await db.connect()
let ok = 0, failed = 0
for (const f of files) {
  if (SKIP.has(f)) { console.log(`[SKIP] ${f} (seed-only, no schema)`); continue }
  const sql = readFileSync(`supabase/migrations/${f}`, 'utf8')
  try {
    await db.query(sql)
    ok++
    console.log(`[OK]   ${f}`)
  } catch (e) {
    failed++
    console.error(`[FAIL] ${f} → ${e.message}`)
    console.error('Stopping at first failure so it can be inspected.')
    break
  }
}
console.log(`\napplied=${ok} failed=${failed} of ${files.length}`)
await db.end()
process.exit(failed ? 1 : 0)
