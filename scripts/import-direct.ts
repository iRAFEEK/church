/**
 * Fast direct Postgres import of Coptic Reader data.
 * Phase 1: Ensure tradition + categories exist, get real IDs
 * Phase 2: Replace hardcoded IDs in SQL with real IDs, then execute
 *
 * Usage: npx tsx scripts/import-direct.ts
 */

import { readFileSync } from 'fs'
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SQL_FILE = 'supabase/seeds/coptic-reader-import.sql'
const BATCH_SIZE = 100

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env.local')
    process.exit(1)
  }

  console.log('Connecting to database...')
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Connected!')

  // Phase 1: Get real tradition ID
  const { rows: traditions } = await client.query(
    "SELECT id FROM liturgical_traditions WHERE slug = 'coptic'"
  )
  if (traditions.length === 0) {
    console.error('Coptic tradition not found. Run migration first.')
    process.exit(1)
  }
  const realTraditionId = traditions[0].id
  console.log(`Real tradition ID: ${realTraditionId}`)

  // Phase 2: Ensure new categories exist (ones not in original migration)
  const newCategories = [
    { slug: 'baptism', name: 'Baptism', name_ar: 'المعمودية', icon: 'Droplets', sort: 7 },
    { slug: 'crowning', name: 'Crowning (Wedding)', name_ar: 'الإكليل', icon: 'Crown', sort: 8 },
    { slug: 'funeral', name: 'Funeral', name_ar: 'الجنازات', icon: 'Cross', sort: 9 },
    { slug: 'unction', name: 'Anointing of the Sick', name_ar: 'القنديل', icon: 'Heart', sort: 10 },
    { slug: 'pascha', name: 'Holy Week (Pascha)', name_ar: 'أسبوع الآلام', icon: 'Cross', sort: 11 },
    { slug: 'incense', name: 'Raising of Incense', name_ar: 'رفع بخور', icon: 'Flame', sort: 12 },
    { slug: 'consecrations', name: 'Consecrations', name_ar: 'التكريسات', icon: 'Star', sort: 13 },
    { slug: 'antiphonary', name: 'Antiphonary', name_ar: 'الأنتيفونا', icon: 'Book', sort: 14 },
    { slug: 'lakkan', name: 'Foot Washing', name_ar: 'اللقان', icon: 'Droplets', sort: 15 },
    { slug: 'papal', name: 'Papal Rites', name_ar: 'الطقوس البابوية', icon: 'Crown', sort: 16 },
    { slug: 'prostration', name: 'Prostration', name_ar: 'المطانيات', icon: 'ArrowDown', sort: 17 },
    { slug: 'veneration', name: 'Veneration', name_ar: 'التبجيل', icon: 'Heart', sort: 18 },
  ]

  for (const cat of newCategories) {
    await client.query(
      `INSERT INTO liturgical_categories (tradition_id, slug, name, name_ar, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tradition_id, slug) DO NOTHING`,
      [realTraditionId, cat.slug, cat.name, cat.name_ar, cat.icon, cat.sort]
    )
  }
  console.log('New categories ensured.')

  // Phase 3: Build category ID lookup
  const { rows: allCats } = await client.query(
    'SELECT id, slug FROM liturgical_categories'
  )
  const catIdBySlug: Record<string, string> = {}
  for (const row of allCats) {
    catIdBySlug[row.slug] = row.id
  }
  console.log(`Category lookup: ${Object.keys(catIdBySlug).length} categories`)

  // Phase 4: Read SQL and build ID replacement map
  console.log('Reading SQL file...')
  const sql = readFileSync(SQL_FILE, 'utf-8')

  // Build replacement map: generated UUID -> real UUID
  // The SQL has tradition ID as '00000000-0000-0000-0000-000000000001'
  // and category IDs from the generated SQL that we need to map
  const replacements: Record<string, string> = {
    '00000000-0000-0000-0000-000000000001': realTraditionId,
  }

  // Extract generated category IDs from the SQL and map to real ones
  const catRegex = /VALUES\s*\(\s*'([0-9a-f-]+)',\s*'00000000-0000-0000-0000-000000000001',\s*'([a-z_]+)',/g
  let match
  while ((match = catRegex.exec(sql)) !== null) {
    const generatedId = match[1]
    const slug = match[2]
    if (catIdBySlug[slug]) {
      replacements[generatedId] = catIdBySlug[slug]
    }
  }

  console.log(`ID replacements: ${Object.keys(replacements).length} mappings`)

  // Phase 5: Parse statements, replacing IDs
  const statements: string[] = []
  let current = ''

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()
    if (current === '' && (trimmed.startsWith('--') || trimmed === '' || trimmed === 'BEGIN;' || trimmed === 'COMMIT;')) {
      continue
    }
    current += line + '\n'
    if (trimmed.endsWith(';')) {
      let stmt = current.trim()
      if (stmt.length > 0 && !stmt.startsWith('--')) {
        // Skip the tradition INSERT (already exists) and category INSERTs (already ensured)
        if (stmt.includes('INSERT INTO liturgical_traditions')) {
          current = ''
          continue
        }
        if (stmt.includes('INSERT INTO liturgical_categories')) {
          current = ''
          continue
        }
        // Replace all generated IDs with real ones
        for (const [oldId, newId] of Object.entries(replacements)) {
          stmt = stmt.replaceAll(oldId, newId)
        }
        statements.push(stmt)
      }
      current = ''
    }
  }

  console.log(`Found ${statements.length} statements to execute (after skipping tradition/category inserts)`)

  // Phase 6: Execute in batches
  const totalBatches = Math.ceil(statements.length / BATCH_SIZE)
  let successCount = 0
  let errorCount = 0
  const startTime = Date.now()

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const batch = statements.slice(i, i + BATCH_SIZE)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rate = successCount > 0 ? (successCount / ((Date.now() - startTime) / 1000)).toFixed(0) : '...'

    process.stdout.write(
      `\rBatch ${batchNum}/${totalBatches} | ${successCount}/${statements.length} done | ${rate}/s | ${elapsed}s`
    )

    try {
      await client.query('BEGIN')
      for (const stmt of batch) {
        await client.query(stmt)
      }
      await client.query('COMMIT')
      successCount += batch.length
    } catch (err: unknown) {
      await client.query('ROLLBACK').catch(() => {})

      // Retry individual statements from failed batch
      for (const stmt of batch) {
        try {
          await client.query(stmt)
          successCount++
        } catch (stmtErr: unknown) {
          errorCount++
          if (errorCount <= 5) {
            const msg = stmtErr instanceof Error ? stmtErr.message : String(stmtErr)
            console.error(`\n  Error: ${msg.slice(0, 200)}`)
            console.error(`  Statement prefix: ${stmt.slice(0, 100)}...`)
          }
        }
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n\nDone in ${totalTime}s!`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Errors:  ${errorCount}`)
  console.log(`  Total:   ${statements.length}`)

  // Verify counts
  const result = await client.query(`
    SELECT 'traditions' as tbl, count(*)::int FROM liturgical_traditions
    UNION ALL SELECT 'categories', count(*)::int FROM liturgical_categories
    UNION ALL SELECT 'sections', count(*)::int FROM liturgical_sections
    UNION ALL SELECT 'content', count(*)::int FROM liturgical_content
    UNION ALL SELECT 'hymns', count(*)::int FROM hymns
    UNION ALL SELECT 'readings', count(*)::int FROM lectionary_readings
    ORDER BY tbl
  `)
  console.log('\nDatabase counts:')
  for (const row of result.rows) {
    console.log(`  ${row.tbl}: ${row.count}`)
  }

  await client.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
