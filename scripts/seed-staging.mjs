#!/usr/bin/env node
/**
 * Seed STAGING with deterministic test accounts for QA / walkthroughs.
 * Uses the staging service-role key (auth.admin) + direct SQL for status fixes.
 * Guarded: refuses to run against prod.
 *
 *   node scripts/seed-staging.mjs
 *
 * Accounts (all password123):
 *   platform@staging.test  — super_admin of the seed church + Ekklesia platform operator
 *   member1@staging.test   — active member of the seed church (multi-church tester)
 */
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { assertNotProd } from './lib/db-guard.mjs'

const env = Object.fromEntries(
  readFileSync('.env.staging', 'utf8').split('\n').filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
)
assertNotProd(env.STAGING_DB_URL)
if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(env.STAGING_PROJECT_REF)) {
  console.error('URL/ref mismatch — refusing'); process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const db = new pg.Client({ connectionString: env.STAGING_DB_URL })
await db.connect()

const { rows: [church] } = await db.query(`SELECT id, name FROM churches ORDER BY created_at ASC LIMIT 1`)
if (!church) { console.error('no seed church found'); process.exit(1) }
console.log('seed church:', church.name, church.id)

async function ensureUser(email, { role, active }) {
  // Create (idempotent-ish: look up first)
  const { rows: existing } = await db.query(`SELECT id FROM auth.users WHERE email = $1`, [email])
  let id = existing[0]?.id
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: 'password123', email_confirm: true,
      user_metadata: { church_id: church.id },
    })
    if (error) throw new Error(`createUser ${email}: ${error.message}`)
    id = data.user.id
    console.log('created', email, id)
  } else {
    console.log('exists ', email, id)
  }

  // Show what the 088 trigger produced BEFORE we adjust (assert self-signup => pending)
  const { rows: [before] } = await db.query(
    `SELECT role, status FROM user_churches WHERE user_id = $1 AND church_id = $2`, [id, church.id])
  console.log('  trigger produced:', JSON.stringify(before))

  // Promote/activate as requested (profiles.role update fires the 076 sync trigger for role)
  await db.query(
    `UPDATE profiles SET role = $2, onboarding_completed = true,
       first_name = $3, last_name = 'Staging', first_name_ar = $4, last_name_ar = 'ستاجينج'
     WHERE id = $1`,
    [id, role, email.split('@')[0], email.split('@')[0]])
  await db.query(
    `UPDATE user_churches SET status = $3, role = $2 WHERE user_id = $1 AND church_id = $4`,
    [id, role, active ? 'active' : 'pending', church.id])
  const { rows: [after] } = await db.query(
    `SELECT role, status FROM user_churches WHERE user_id = $1 AND church_id = $2`, [id, church.id])
  console.log('  final membership:', JSON.stringify(after))
  return id
}

await ensureUser('platform@staging.test', { role: 'super_admin', active: true })
await ensureUser('member1@staging.test', { role: 'member', active: true })

await db.end()
console.log('\nstaging seed complete')
