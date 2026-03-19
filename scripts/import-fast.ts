/**
 * Fast bulk import of Coptic Reader data.
 * Parses XML directly and uses multi-row INSERTs (500 rows per statement).
 * ~100x faster than single-row inserts.
 *
 * Usage: npx tsx scripts/import-fast.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename, relative } from 'path'
import { createHash } from 'crypto'
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DATA_DIR = '/tmp/coptic-reader-data/documents'
const ROWS_PER_INSERT = 500

// ─── Helpers ──────────────────────────────────────────────

function pathToUuid(path: string): string {
  const hash = createHash('md5').update(path).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

function escSql(s: string | null): string {
  if (s === null) return 'NULL'
  return "'" + s.replace(/'/g, "''") + "'"
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

function extractLang(xml: string, lang: string): string | null {
  const regex = new RegExp(`<Language\\s+id="${lang}"[^>]*>([\\s\\S]*?)</Language>`, 'g')
  const parts: string[] = []
  let m
  while ((m = regex.exec(xml)) !== null) {
    const text = stripHtml(m[1]).trim()
    if (text) parts.push(text)
  }
  return parts.length > 0 ? parts.join('\n\n') : null
}

function resolveIncludes(xml: string, depth = 0, maxSize = 500_000): string {
  if (depth > 3) return xml
  if (xml.length > maxSize) return xml // prevent OOM
  return xml.replace(/<InsertDocument\s+path="([^"]+)"\s*\/>/g, (_, path) => {
    const filePath = join(DATA_DIR, path + '.xml')
    if (!existsSync(filePath)) return ''
    try {
      const content = readFileSync(filePath, 'utf-8')
      if (content.length > 100_000) return '' // skip huge includes
      return resolveIncludes(content, depth + 1, maxSize)
    } catch { return '' }
  })
}

function getRole(xml: string): string {
  // Check for Role wrapper
  const roleMatch = xml.match(/<Role\s+id="([^"]+)"/)
  if (roleMatch) {
    const role = roleMatch[1].toLowerCase()
    if (role.includes('priest')) return 'prayer'
    if (role.includes('reader')) return 'reading'
    if (role.includes('deacon') || role.includes('congregation') || role.includes('people')) return 'response'
    if (role.includes('introduction')) return 'instruction'
  }
  if (xml.includes('<Comment>')) return 'rubric'
  return 'prayer'
}

// Parse a single XML document into content blocks
function parseDocument(xml: string): Array<{
  content_type: string
  title_en: string | null
  title_ar: string | null
  body_en: string | null
  body_ar: string | null
  body_coptic: string | null
  metadata: string
}> {
  const blocks: Array<{
    content_type: string
    title_en: string | null
    title_ar: string | null
    body_en: string | null
    body_ar: string | null
    body_coptic: string | null
    metadata: string
  }> = []

  // Split by major structural elements
  // Strategy: extract all <Text> blocks with their context
  const textRegex = /<Text>([\s\S]*?)<\/Text>/g
  let match
  let lastRole = 'prayer'

  // Track context for role detection
  const lines = xml.split('\n')
  let currentRole = 'prayer'

  while ((match = textRegex.exec(xml)) !== null) {
    const textBlock = match[1]
    const textPos = match.index

    // Look backwards for closest Role tag
    const preceding = xml.slice(Math.max(0, textPos - 500), textPos)
    const roleMatch = preceding.match(/<Role\s+id="([^"]+)"[^>]*>[^<]*$/s)
    if (roleMatch) {
      const role = roleMatch[1].toLowerCase()
      if (role.includes('priest')) currentRole = 'prayer'
      else if (role.includes('reader')) currentRole = 'reading'
      else if (role.includes('deacon') || role.includes('congregation') || role.includes('people')) currentRole = 'response'
      else if (role.includes('introduction')) currentRole = 'instruction'
      else currentRole = 'prayer'
    }

    // Check if inside a Comment
    const commentCheck = xml.slice(Math.max(0, textPos - 200), textPos)
    if (commentCheck.includes('<Comment>') && !commentCheck.includes('</Comment>')) {
      currentRole = 'rubric'
    }

    const en = extractLang(textBlock, 'English')
    const ar = extractLang(textBlock, 'Arabic')
    const coptic = extractLang(textBlock, 'Coptic')

    if (en || ar || coptic) {
      // Check for title in nearest Section
      let titleEn: string | null = null
      let titleAr: string | null = null
      const titleCheck = xml.slice(Math.max(0, textPos - 1000), textPos)
      const titleMatch = titleCheck.match(/<Title>\s*<Language\s+id="English"[^>]*>([\s\S]*?)<\/Language>\s*<Language\s+id="Arabic"[^>]*>([\s\S]*?)<\/Language>\s*<\/Title>[^<]*$/s)
      if (titleMatch) {
        titleEn = stripHtml(titleMatch[1]).trim() || null
        titleAr = stripHtml(titleMatch[2]).trim() || null
      }

      blocks.push({
        content_type: currentRole,
        title_en: titleEn,
        title_ar: titleAr,
        body_en: en,
        body_ar: ar,
        body_coptic: coptic,
        metadata: '{}',
      })
    }
  }

  return blocks
}

// ─── Category config ──────────────────────────────────────

const CATEGORY_MAP: Record<string, { slug: string; name: string; name_ar: string; icon: string; sort: number }> = {
  agpeya:           { slug: 'agpeya', name: 'Agpeya', name_ar: 'الأجبية', icon: 'BookHeart', sort: 1 },
  readings:         { slug: 'katameros', name: 'Readings', name_ar: 'القطمارس', icon: 'BookText', sort: 2 },
  liturgies:        { slug: 'liturgy', name: 'Liturgy', name_ar: 'القداس', icon: 'Church', sort: 3 },
  praises:          { slug: 'psalmody', name: 'Psalmody', name_ar: 'الأبصلمودية', icon: 'Music2', sort: 4 },
  melodies:         { slug: 'hymns', name: 'Hymns', name_ar: 'الألحان', icon: 'Music', sort: 5 },
  clergy:           { slug: 'clergy', name: 'Clergy', name_ar: 'الكهنوت', icon: 'Crown', sort: 6 },
  baptism:          { slug: 'baptism', name: 'Baptism', name_ar: 'المعمودية', icon: 'Droplets', sort: 7 },
  crowning:         { slug: 'crowning', name: 'Wedding', name_ar: 'الإكليل', icon: 'Crown', sort: 8 },
  funeral:          { slug: 'funeral', name: 'Funeral', name_ar: 'الجنازات', icon: 'Cross', sort: 9 },
  unction:          { slug: 'unction', name: 'Anointing', name_ar: 'القنديل', icon: 'Heart', sort: 10 },
  pascha:           { slug: 'pascha', name: 'Holy Week', name_ar: 'أسبوع الآلام', icon: 'Cross', sort: 11 },
  raisingOfIncense: { slug: 'incense', name: 'Incense', name_ar: 'رفع بخور', icon: 'Flame', sort: 12 },
  consecrations:    { slug: 'consecrations', name: 'Consecrations', name_ar: 'التكريسات', icon: 'Star', sort: 13 },
  antiphonary:      { slug: 'antiphonary', name: 'Antiphonary', name_ar: 'الأنتيفونا', icon: 'Book', sort: 14 },
  lakkan:           { slug: 'lakkan', name: 'Foot Washing', name_ar: 'اللقان', icon: 'Droplets', sort: 15 },
  papal:            { slug: 'papal', name: 'Papal Rites', name_ar: 'الطقوس البابوية', icon: 'Crown', sort: 16 },
  prostration:      { slug: 'prostration', name: 'Prostration', name_ar: 'المطانيات', icon: 'ArrowDown', sort: 17 },
  veneration:       { slug: 'veneration', name: 'Veneration', name_ar: 'التبجيل', icon: 'Heart', sort: 18 },
}

// Directories to skip
const SKIP_DIRS = new Set(['include', 'system', 'index'])

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) { console.error('DATABASE_URL not found'); process.exit(1) }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Connected to database')

  // Get tradition ID
  const { rows: [tradition] } = await client.query("SELECT id FROM liturgical_traditions WHERE slug = 'coptic'")
  if (!tradition) { console.error('Coptic tradition not found'); process.exit(1) }
  const traditionId = tradition.id

  // Clear existing data for clean import
  console.log('Clearing existing content...')
  await client.query('DELETE FROM liturgical_content')
  await client.query('DELETE FROM hymns')
  await client.query('DELETE FROM liturgical_sections WHERE category_id IN (SELECT id FROM liturgical_categories WHERE tradition_id = $1)', [traditionId])
  console.log('Cleared.')

  // Ensure all categories exist, build lookup
  const catIds: Record<string, string> = {}
  for (const [dir, cat] of Object.entries(CATEGORY_MAP)) {
    await client.query(
      `INSERT INTO liturgical_categories (tradition_id, slug, name, name_ar, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tradition_id, slug) DO UPDATE SET name = $3, name_ar = $4, icon = $5, sort_order = $6
       RETURNING id`,
      [traditionId, cat.slug, cat.name, cat.name_ar, cat.icon, cat.sort]
    ).then(r => { catIds[dir] = r.rows[0].id })
  }
  console.log(`${Object.keys(catIds).length} categories ready`)

  // Collect all content
  const allSections: Array<{ id: string; catId: string; slug: string; titleEn: string; titleAr: string; descEn: string | null; descAr: string | null; sort: number; meta: string }> = []
  const allContent: Array<{ id: string; sectionId: string; type: string; titleEn: string | null; titleAr: string | null; bodyEn: string | null; bodyAr: string | null; bodyCoptic: string | null; sort: number; meta: string }> = []
  const allHymns: Array<{ id: string; titleEn: string; titleAr: string | null; titleCoptic: string | null; lyricsEn: string | null; lyricsAr: string | null; lyricsCoptic: string | null; season: string | null; tags: string }> = []

  const startTime = Date.now()
  let fileCount = 0

  // Process each category directory
  for (const [dirName, catConfig] of Object.entries(CATEGORY_MAP)) {
    const dirPath = join(DATA_DIR, dirName)
    if (!existsSync(dirPath)) continue
    if (SKIP_DIRS.has(dirName)) continue

    const catId = catIds[dirName]
    if (!catId) continue

    // Find all XML files recursively
    const xmlFiles = findXmlFiles(dirPath)

    for (let fi = 0; fi < xmlFiles.length; fi++) {
      const filePath = xmlFiles[fi]
      const relPath = relative(DATA_DIR, filePath)
      const fileName = basename(filePath, '.xml')
      fileCount++

      if (fileCount % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        process.stdout.write(`\rProcessing file ${fileCount}... (${elapsed}s)`)
      }

      try {
        let xml = readFileSync(filePath, 'utf-8')
        // Skip include resolution for readings (they're Bible text — too large)
        if (dirName !== 'readings') {
          xml = resolveIncludes(xml)
        }

        // Extract document title
        const titleEn = extractLang(xml.match(/<Title>([\s\S]*?)<\/Title>/)?.[1] || '', 'English') || fileName
        const titleAr = extractLang(xml.match(/<Title>([\s\S]*?)<\/Title>/)?.[1] || '', 'Arabic') || fileName
        const descEn = extractLang(xml.match(/<Comment>([\s\S]*?)<\/Comment>/)?.[1] || '', 'English')
        const descAr = extractLang(xml.match(/<Comment>([\s\S]*?)<\/Comment>/)?.[1] || '', 'Arabic')

        const sectionId = pathToUuid(relPath)
        // Use relative path for slug to ensure uniqueness (e.g., readings/genesis/1 → readings-genesis-1)
        const relSlug = relative(join(DATA_DIR, dirName), filePath).replace(/\.xml$/, '')
        const sectionSlug = relSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 200)

        // For melodies → hymns table
        if (dirName === 'melodies') {
          const coptic = extractLang(xml, 'Coptic')
          allHymns.push({
            id: sectionId,
            titleEn: titleEn,
            titleAr: titleAr,
            titleCoptic: coptic ? titleEn : null,
            lyricsEn: extractLang(xml, 'English'),
            lyricsAr: extractLang(xml, 'Arabic'),
            lyricsCoptic: coptic,
            season: null,
            tags: "'{}'",
          })
          continue
        }

        allSections.push({
          id: sectionId,
          catId,
          slug: sectionSlug,
          titleEn,
          titleAr,
          descEn,
          descAr,
          sort: fi,
          meta: JSON.stringify({ source_file: relPath }),
        })

        // Parse content blocks
        const blocks = parseDocument(xml)
        for (let bi = 0; bi < blocks.length; bi++) {
          const b = blocks[bi]
          allContent.push({
            id: pathToUuid(`${relPath}:${bi}`),
            sectionId,
            type: b.content_type,
            titleEn: b.title_en,
            titleAr: b.title_ar,
            bodyEn: b.body_en,
            bodyAr: b.body_ar,
            bodyCoptic: b.body_coptic,
            sort: bi,
            meta: b.metadata,
          })
        }
      } catch (err) {
        // Skip broken files
      }
    }
  }

  const parseTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nParsed ${fileCount} files in ${parseTime}s`)
  console.log(`  Sections: ${allSections.length}`)
  console.log(`  Content blocks: ${allContent.length}`)
  console.log(`  Hymns: ${allHymns.length}`)

  // ─── Bulk insert sections ──────────────────────────────
  console.log('\nInserting sections...')
  const insertStart = Date.now()

  for (let i = 0; i < allSections.length; i += ROWS_PER_INSERT) {
    const batch = allSections.slice(i, i + ROWS_PER_INSERT)
    const values = batch.map(s =>
      `(${escSql(s.id)}, ${escSql(s.catId)}, ${escSql(s.slug)}, ${escSql(s.titleEn)}, ${escSql(s.titleAr)}, ${escSql(s.descEn)}, ${escSql(s.descAr)}, ${s.sort}, ${escSql(s.meta)}::jsonb)`
    ).join(',\n')

    try {
      await client.query(`
        INSERT INTO liturgical_sections (id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, title_ar = EXCLUDED.title_ar,
          description = EXCLUDED.description, description_ar = EXCLUDED.description_ar,
          sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata
      `)
    } catch (err: unknown) {
      // On slug conflict, retry with appended hash
      for (const s of batch) {
        try {
          await client.query(
            `INSERT INTO liturgical_sections (id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
             ON CONFLICT (id) DO UPDATE SET title = $4, title_ar = $5, sort_order = $8`,
            [s.id, s.catId, s.slug + '-' + s.id.slice(0,6), s.titleEn, s.titleAr, s.descEn, s.descAr, s.sort, s.meta]
          )
        } catch { /* skip duplicate */ }
      }
    }
  }
  console.log(`  Sections done in ${((Date.now() - insertStart) / 1000).toFixed(1)}s`)

  // ─── Bulk insert content ───────────────────────────────
  console.log('Inserting content blocks...')
  const contentStart = Date.now()
  let inserted = 0

  for (let i = 0; i < allContent.length; i += ROWS_PER_INSERT) {
    const batch = allContent.slice(i, i + ROWS_PER_INSERT)
    const values = batch.map(c =>
      `(${escSql(c.id)}, ${escSql(c.sectionId)}, ${escSql(c.type)}, ${escSql(c.titleEn)}, ${escSql(c.titleAr)}, ${escSql(c.bodyEn)}, ${escSql(c.bodyAr)}, ${escSql(c.bodyCoptic)}, ${c.sort}, ${escSql(c.meta)}::jsonb)`
    ).join(',\n')

    try {
      await client.query(`
        INSERT INTO liturgical_content (id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, sort_order, metadata)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          body_en = EXCLUDED.body_en, body_ar = EXCLUDED.body_ar, body_coptic = EXCLUDED.body_coptic,
          title = EXCLUDED.title, title_ar = EXCLUDED.title_ar,
          content_type = EXCLUDED.content_type, sort_order = EXCLUDED.sort_order
      `)
      inserted += batch.length
    } catch (err: unknown) {
      // Retry one by one
      for (const c of batch) {
        try {
          await client.query(`
            INSERT INTO liturgical_content (id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, sort_order, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
            ON CONFLICT (id) DO UPDATE SET
              body_en = $6, body_ar = $7, body_coptic = $8, sort_order = $9
          `, [c.id, c.sectionId, c.type, c.titleEn, c.titleAr, c.bodyEn, c.bodyAr, c.bodyCoptic, c.sort, c.meta])
          inserted++
        } catch { /* skip */ }
      }
    }

    if ((i / ROWS_PER_INSERT) % 10 === 0) {
      const pct = Math.round(i / allContent.length * 100)
      process.stdout.write(`\r  ${inserted}/${allContent.length} (${pct}%)`)
    }
  }
  console.log(`\n  Content done in ${((Date.now() - contentStart) / 1000).toFixed(1)}s (${inserted} rows)`)

  // ─── Bulk insert hymns ─────────────────────────────────
  if (allHymns.length > 0) {
    console.log('Inserting hymns...')
    const values = allHymns.map(h =>
      `(${escSql(h.id)}, ${escSql(traditionId)}, ${escSql(h.titleEn)}, ${escSql(h.titleAr)}, ${escSql(h.titleCoptic)}, ${escSql(h.lyricsEn)}, ${escSql(h.lyricsAr)}, ${escSql(h.lyricsCoptic)}, ${escSql(h.season)}, '{}'::text[])`
    ).join(',\n')

    await client.query(`
      INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_en, lyrics_ar, lyrics_coptic, season, tags)
      VALUES ${values}
      ON CONFLICT (id) DO UPDATE SET
        lyrics_en = EXCLUDED.lyrics_en, lyrics_ar = EXCLUDED.lyrics_ar, lyrics_coptic = EXCLUDED.lyrics_coptic
    `)
    console.log(`  ${allHymns.length} hymns inserted`)
  }

  // ─── Final counts ──────────────────────────────────────
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  const result = await client.query(`
    SELECT 'categories' as tbl, count(*)::int FROM liturgical_categories
    UNION ALL SELECT 'sections', count(*)::int FROM liturgical_sections
    UNION ALL SELECT 'content', count(*)::int FROM liturgical_content
    UNION ALL SELECT 'hymns', count(*)::int FROM hymns
    ORDER BY tbl
  `)

  console.log(`\nDone in ${totalTime}s!`)
  console.log('Database counts:')
  for (const row of result.rows) {
    console.log(`  ${row.tbl}: ${row.count}`)
  }

  await client.end()
}

function findXmlFiles(dir: string): string[] {
  const results: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findXmlFiles(fullPath))
    } else if (entry.name.endsWith('.xml')) {
      results.push(fullPath)
    }
  }
  return results
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
