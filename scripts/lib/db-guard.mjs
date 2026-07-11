/**
 * Safety guard for DESTRUCTIVE db scripts (seed, reset, wipe).
 *
 * Import and call assertNotProd() at the top of any script that WRITES to a database, so a
 * mis-set DATABASE_URL can never nuke or pollute production. Read-only scripts (e.g.
 * verify-prod-schema.mjs) don't need it.
 *
 *   import { assertNotProd } from './lib/db-guard.mjs'
 *   assertNotProd()   // throws + exits 1 if the target looks like the prod project
 *
 * The prod Supabase project ref is pinned here. Update PROD_REFS if prod ever moves.
 */
const PROD_REFS = [
  'hronbmjlklylupkbvgve', // ekklesia production Supabase
]

export function assertNotProd(url = process.env.DATABASE_URL || process.env.STAGING_DB_URL || '') {
  const target = String(url)
  const hit = PROD_REFS.find((ref) => target.includes(ref))
  if (hit) {
    console.error(
      `\n⛔ REFUSING TO RUN: the target database looks like PRODUCTION (project ref "${hit}").\n` +
      `   This script writes to the database and must only run against local/staging.\n` +
      `   Point DATABASE_URL/STAGING_DB_URL at a non-prod database and retry.\n`
    )
    process.exit(1)
  }
  // Allow ALLOW_PROD_WRITE=1 as an explicit, deliberate override for rare intentional prod runs.
  if (process.env.ALLOW_PROD_WRITE === '1') {
    console.warn('⚠️  ALLOW_PROD_WRITE=1 set — prod-write guard bypassed intentionally.')
  }
}
