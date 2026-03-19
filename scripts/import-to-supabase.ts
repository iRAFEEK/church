/**
 * Import Coptic Reader data into remote Supabase database.
 * Reads the generated SQL file and executes it in batches via supabase db query.
 *
 * Usage: npx tsx scripts/import-to-supabase.ts
 */

import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const SQL_FILE = 'supabase/seeds/coptic-reader-import.sql'
const BATCH_SIZE = 50 // statements per batch

function main() {
  console.log('Reading SQL file...')
  const sql = readFileSync(SQL_FILE, 'utf-8')

  // Split into individual statements
  // Each INSERT ends with a semicolon on its own conceptual line
  const statements: string[] = []
  let current = ''

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (trimmed.startsWith('--') || trimmed === '') {
      continue
    }

    // Skip BEGIN/COMMIT — we handle transactions per batch
    if (trimmed === 'BEGIN;' || trimmed === 'COMMIT;') {
      continue
    }

    current += line + '\n'

    // Statement ends with semicolon (not inside a string)
    if (trimmed.endsWith(';')) {
      const stmt = current.trim()
      if (stmt.length > 0) {
        statements.push(stmt)
      }
      current = ''
    }
  }

  // Add any remaining
  if (current.trim().length > 0 && !current.trim().startsWith('--')) {
    statements.push(current.trim())
  }

  console.log(`Found ${statements.length} SQL statements`)

  // Execute in batches
  const totalBatches = Math.ceil(statements.length / BATCH_SIZE)
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const batch = statements.slice(i, i + BATCH_SIZE)
    const batchSql = 'BEGIN;\n' + batch.join('\n') + '\nCOMMIT;'

    process.stdout.write(`\rBatch ${batchNum}/${totalBatches} (${Math.round(batchNum/totalBatches*100)}%)...`)

    try {
      // Write batch to temp file to avoid shell escaping issues
      const tmpFile = `/tmp/batch-${batchNum}.sql`
      require('fs').writeFileSync(tmpFile, batchSql)

      execSync(`npx supabase db query --linked < "${tmpFile}"`, {
        cwd: process.cwd(),
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      successCount += batch.length

      // Clean up temp file
      try { require('fs').unlinkSync(tmpFile) } catch {}
    } catch (err: unknown) {
      errorCount += batch.length
      const msg = err instanceof Error ? err.message : String(err)
      // Log first error of each batch but continue
      console.error(`\nBatch ${batchNum} failed: ${msg.slice(0, 200)}`)

      // Try individual statements from failed batch
      for (const stmt of batch) {
        try {
          const tmpFile = `/tmp/stmt-retry.sql`
          require('fs').writeFileSync(tmpFile, stmt)
          execSync(`npx supabase db query --linked < "${tmpFile}"`, {
            cwd: process.cwd(),
            timeout: 60000,
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          successCount++
          errorCount--
        } catch {
          // Individual statement failed, skip it
        }
      }
    }
  }

  console.log(`\n\nDone! ${successCount} succeeded, ${errorCount} failed out of ${statements.length} total`)
}

main()
