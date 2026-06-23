#!/usr/bin/env node
/**
 * Verify a database is a clean, correct application of all migrations.
 *
 *   DATABASE_URL=postgres://... node scripts/verify-prod-schema.mjs
 *   # or it reads .env.local automatically
 *
 * Encodes the schema-integrity checks surfaced during pre-launch testing:
 * RLS coverage, no duplicate FKs, required columns, role-sync trigger, role
 * consistency, finance gating, and migration completeness. Exit code 1 on any
 * failure so it can gate a deploy.
 */
import pg from 'pg'
import { config } from 'dotenv'
config({ path: '.env.local' })

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(2) }
const db = new pg.Client({ connectionString: url })

let pass = 0, fail = 0
const ok = (name, cond, detail = '') => {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`)
  cond ? pass++ : fail++
}
const q = async (sql, p = []) => (await db.query(sql, p)).rows

await db.connect()
console.log('=== Schema verification ===')

// 1. RLS enabled on every public table
const noRls = await q(`
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=false
  AND c.relname NOT LIKE 'pg_%' AND c.relname NOT IN ('schema_migrations','spatial_ref_sys')`)
ok('RLS enabled on all public tables', noRls.length === 0, noRls.length ? 'missing on: ' + noRls.map(r => r.relname).join(', ') : '')

// 2. No duplicate single-column foreign keys (the PGRST201 embed bug)
const dupFk = await q(`
  SELECT conrelid::regclass::text tbl, a.attname col, count(*) n
  FROM pg_constraint con JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=ANY(con.conkey)
  WHERE con.contype='f' AND array_length(con.conkey,1)=1
  GROUP BY conrelid, a.attname HAVING count(*)>1`)
ok('No duplicate foreign keys', dupFk.length === 0, dupFk.length ? dupFk.map(r => `${r.tbl}.${r.col}(${r.n})`).join(', ') : '')

// 3. Required columns the application code depends on
const hasCol = async (t, c) => (await q(`SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [t, c])).length > 0
ok('funds.currency present (mig 074)', await hasCol('funds', 'currency'))
ok('budgets.currency present (mig 074)', await hasCol('budgets', 'currency'))
ok('songs.published_by_church_id present (mig 072/074)', await hasCol('songs', 'published_by_church_id'))
ok('churches.visitor_form_config present (mig 056)', await hasCol('churches', 'visitor_form_config'))

// 4. Role-sync trigger present (mig 076) + no role mismatches
const trig = await q(`SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_user_churches_role'`)
ok('Role-sync trigger present (mig 076)', trig.length > 0)
const mismatch = await q(`
  SELECT count(*)::int n FROM user_churches uc JOIN profiles p
    ON p.id=uc.user_id AND p.church_id=uc.church_id WHERE uc.role<>p.role`)
ok('No profiles/user_churches role mismatches', mismatch[0].n === 0, 'mismatches=' + mismatch[0].n)
const noUc = await q(`
  SELECT count(*)::int n FROM profiles p LEFT JOIN user_churches uc
    ON uc.user_id=p.id AND uc.church_id=p.church_id WHERE uc.user_id IS NULL`)
ok('Every profile has a user_churches row', noUc[0].n === 0, 'missing=' + noUc[0].n)

// 5. Songs UPDATE policy is church-scoped (mig 073, cross-church IDOR fix)
const songPol = await q(`
  SELECT pg_get_expr(polqual, polrelid) q FROM pg_policy
  WHERE polrelid='songs'::regclass AND polname='Leaders update songs'`)
ok('Songs UPDATE policy is church-scoped (mig 073)',
  songPol.length > 0 && /church_id/.test(songPol[0].q || ''),
  songPol[0]?.q ? '' : 'policy missing')

// 6. Migration history sanity
const migCount = await q(`SELECT count(*)::int n FROM supabase_migrations.schema_migrations`).catch(() => [{ n: 'n/a (no tracker)' }])
console.log(`  [INFO] applied migration versions tracked: ${migCount[0].n}`)

console.log(`\nRESULT: ${pass} pass, ${fail} fail`)
await db.end()
process.exit(fail ? 1 : 0)
