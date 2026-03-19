/**
 * import-coptic-reader.ts
 *
 * Parses the Coptic Reader XML dataset and generates a single idempotent SQL
 * seed file at supabase/seeds/coptic-reader-import.sql.
 *
 * Usage:
 *   npx tsx scripts/import-coptic-reader.ts
 *
 * The XML data must be present at /tmp/coptic-reader-data/documents/.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

// ── Configuration ────────────────────────────────────────────────────────────

const DATA_DIR = '/tmp/coptic-reader-data/documents'
const OUTPUT_FILE = path.join(__dirname, '..', 'supabase', 'seeds', 'coptic-reader-import.sql')
const MAX_INSERT_DEPTH = 5
// Maximum resolved XML size per file (1 MB) to prevent runaway expansion
const MAX_RESOLVED_SIZE = 1 * 1024 * 1024
// Maximum content blocks per section — prevents massive duplication from shared includes
const MAX_BLOCKS_PER_SECTION = 500

// Fixed tradition UUID (matches agpeya.sql seed)
const COPTIC_TRADITION_ID = '00000000-0000-0000-0000-000000000001'

// ── UUID Generation ──────────────────────────────────────────────────────────

function pathToUuid(p: string): string {
  const hash = crypto.createHash('md5').update(p).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

// ── SQL Escaping ─────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (s == null || s.trim() === '') return 'NULL'
  return `'${s.replace(/'/g, "''")}'`
}

function escJsonb(obj: Record<string, unknown>): string {
  return esc(JSON.stringify(obj))
}

// ── HTML Stripping ───────────────────────────────────────────────────────────

function stripHtml(text: string): string {
  return text
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:ol|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── XML Parsing Helpers ──────────────────────────────────────────────────────

interface ParsedText {
  en: string
  ar: string
  coptic: string
}

interface ContentBlock {
  type: 'text' | 'comment' | 'title' | 'section_start'
  role: string | null
  title: ParsedText | null
  text: ParsedText
  verse: string | null
  seasonId: string | null
}

/** Extract text for a specific language from <Language id="...">...</Language> */
function extractLanguage(xml: string, langId: string): string {
  const pattern = new RegExp(
    `<Language\\s+id=["']${langId}["']\\s*>([\\s\\S]*?)</Language>`,
    'i'
  )
  const match = pattern.exec(xml)
  if (!match) return ''
  return stripHtml(match[1]).trim()
}

/** Extract a trilingual text block from XML containing <Language> tags */
function extractTrilingualText(xml: string): ParsedText {
  return {
    en: extractLanguage(xml, 'English'),
    ar: extractLanguage(xml, 'Arabic'),
    coptic: extractLanguage(xml, 'Coptic') || extractLanguage(xml, 'CopticReading'),
  }
}

/** Extract attribute value from a tag string */
function extractAttr(tagStr: string, attr: string): string | null {
  const pattern = new RegExp(`${attr}=["']([^"']*)["']`)
  const m = pattern.exec(tagStr)
  return m ? m[1] : null
}

// ── File Reading ─────────────────────────────────────────────────────────────

const rawFileCache = new Map<string, string>()
const missingFiles = new Set<string>()

function readRawXmlFile(filePath: string): string {
  const candidates = [filePath, filePath + '.xml']
  for (const candidate of candidates) {
    if (rawFileCache.has(candidate)) return rawFileCache.get(candidate)!
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const content = fs.readFileSync(candidate, 'utf-8')
        rawFileCache.set(candidate, content)
        return content
      }
    } catch {
      // Skip
    }
  }
  if (!missingFiles.has(filePath)) {
    missingFiles.add(filePath)
  }
  return ''
}

/** Resolve all <InsertDocument path="..."/> references, with size and depth limits. */
function resolveInserts(xml: string, depth: number = 0): string {
  if (depth >= MAX_INSERT_DEPTH) return xml
  if (xml.length > MAX_RESOLVED_SIZE) return xml

  let result = ''
  let lastIdx = 0
  const pattern = /<InsertDocument\s+path=["']([^"']+)["']\s*\/>/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(xml)) !== null) {
    result += xml.substring(lastIdx, match.index)
    const refPath = match[1]
    const fullPath = path.join(DATA_DIR, refPath)
    let content = readRawXmlFile(fullPath)
    if (content) {
      // Strip XML declaration and Document wrapper
      content = content
        .replace(/<\?xml[^?]*\?>\s*/g, '')
        .replace(/<Document[^>]*>\s*/gi, '')
        .replace(/<\/Document>\s*/gi, '')
        .trim()
      content = resolveInserts(content, depth + 1)
    }
    result += content
    lastIdx = match.index + match[0].length

    if (result.length > MAX_RESOLVED_SIZE) {
      result += xml.substring(lastIdx)
      return result
    }
  }

  result += xml.substring(lastIdx)
  return result
}

// ── Content Block Extraction (linear scan) ───────────────────────────────────
// Instead of building a DOM tree, we do a single linear scan of the resolved XML,
// extracting <Text>, <Comment>, <Title>, <Section><Title>, and <Role> boundaries.

function extractBlocks(xml: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  // We use a stack-based approach to track current role and season context
  const roleStack: (string | null)[] = [null]
  const seasonStack: (string | null)[] = [null]

  // Find all relevant tags with a single regex scan
  const tagPattern = /<(\/?)(\w+)(\s[^>]*)?\/?>/g
  let tagMatch: RegExpExecArray | null

  while ((tagMatch = tagPattern.exec(xml)) !== null) {
    const isClose = tagMatch[1] === '/'
    const tagName = tagMatch[2]
    const attrs = tagMatch[3] || ''
    const isSelfClose = tagMatch[0].endsWith('/>')

    if (isSelfClose) continue

    if (isClose) {
      if (tagName === 'Role') roleStack.pop()
      if (tagName === 'Season') seasonStack.pop()
      continue
    }

    const currentRole = roleStack[roleStack.length - 1]
    const currentSeason = seasonStack[seasonStack.length - 1]

    switch (tagName) {
      case 'Role': {
        roleStack.push(extractAttr(attrs, 'id'))
        break
      }
      case 'Season': {
        seasonStack.push(extractAttr(attrs, 'id'))
        break
      }
      case 'Text': {
        const verse = extractAttr(attrs, 'verse')
        // Find the matching </Text>
        const closeIdx = findCloseTag(xml, 'Text', tagMatch.index + tagMatch[0].length)
        if (closeIdx === -1) break
        const inner = xml.substring(tagMatch.index + tagMatch[0].length, closeIdx)
        const text = extractTrilingualText(inner)
        if (text.en || text.ar || text.coptic) {
          blocks.push({
            type: 'text',
            role: currentRole,
            title: null,
            text,
            verse,
            seasonId: currentSeason,
          })
        }
        // Advance past this block to avoid re-scanning inner content
        tagPattern.lastIndex = closeIdx + '</Text>'.length
        break
      }
      case 'Comment': {
        const closeIdx = findCloseTag(xml, 'Comment', tagMatch.index + tagMatch[0].length)
        if (closeIdx === -1) break
        const inner = xml.substring(tagMatch.index + tagMatch[0].length, closeIdx)
        const text = extractTrilingualText(inner)
        if (text.en || text.ar) {
          blocks.push({
            type: 'comment',
            role: currentRole,
            title: null,
            text,
            verse: null,
            seasonId: currentSeason,
          })
        }
        tagPattern.lastIndex = closeIdx + '</Comment>'.length
        break
      }
      case 'Title': {
        const closeIdx = findCloseTag(xml, 'Title', tagMatch.index + tagMatch[0].length)
        if (closeIdx === -1) break
        const inner = xml.substring(tagMatch.index + tagMatch[0].length, closeIdx)
        const text = extractTrilingualText(inner)
        if (text.en || text.ar) {
          blocks.push({
            type: 'title',
            role: currentRole,
            title: text,
            text,
            verse: null,
            seasonId: currentSeason,
          })
        }
        tagPattern.lastIndex = closeIdx + '</Title>'.length
        break
      }
    }
  }

  return blocks
}

/** Find the position of the matching close tag, handling nesting. Simple fast version. */
function findCloseTag(xml: string, tagName: string, startIdx: number): number {
  const closeTag = `</${tagName}>`
  const openTag = `<${tagName}`
  let depth = 1
  let pos = startIdx

  while (pos < xml.length && depth > 0) {
    const nextClose = xml.indexOf(closeTag, pos)
    if (nextClose === -1) return -1

    // Count any opens between pos and nextClose
    let searchPos = pos
    while (searchPos < nextClose) {
      const nextOpen = xml.indexOf(openTag, searchPos)
      if (nextOpen === -1 || nextOpen >= nextClose) break
      // Verify it's actually an opening tag (not self-closing and has > or space after name)
      const afterName = xml[nextOpen + openTag.length]
      if (afterName === '>' || afterName === ' ' || afterName === '\t' || afterName === '\n') {
        // Check if self-closing
        const tagEnd = xml.indexOf('>', nextOpen)
        if (tagEnd !== -1 && xml[tagEnd - 1] !== '/') {
          depth++
        }
      }
      searchPos = nextOpen + openTag.length
    }

    depth--
    if (depth === 0) return nextClose
    pos = nextClose + closeTag.length
  }

  return -1
}

// ── Document-level title/comment extraction ──────────────────────────────────

function extractDocTitle(xml: string): ParsedText {
  // Get the first <Title> that is a direct child of <Document> (before any Role/Section)
  const titlePattern = /<Title>([\s\S]*?)<\/Title>/i
  const m = titlePattern.exec(xml)
  if (!m) return { en: '', ar: '', coptic: '' }
  return extractTrilingualText(m[1])
}

function extractDocComment(xml: string): ParsedText | null {
  // Get the first <Comment> before any <Role>/<Section>/<Text>
  const commentPattern = /<Comment>([\s\S]*?)<\/Comment>/i
  const m = commentPattern.exec(xml)
  if (!m) return null
  // Only if it appears before the first Text/Role/Section
  const firstContent = Math.min(
    xml.indexOf('<Text') === -1 ? Infinity : xml.indexOf('<Text'),
    xml.indexOf('<Role') === -1 ? Infinity : xml.indexOf('<Role'),
    xml.indexOf('<Section') === -1 ? Infinity : xml.indexOf('<Section'),
  )
  if (m.index < firstContent || firstContent === Infinity) {
    return extractTrilingualText(m[1])
  }
  return null
}

// ── Role to content_type Mapping ─────────────────────────────────────────────

function roleToContentType(role: string | null, blockType: string): string {
  if (blockType === 'comment') return 'rubric'
  if (blockType === 'title' || blockType === 'section_start') return 'instruction'

  switch (role) {
    case 'Priest': return 'prayer'
    case 'Congregation':
    case 'People':
    case 'Deacon': return 'response'
    case 'Reader': return 'reading'
    case 'Introduction': return 'instruction'
    default: return 'prayer'
  }
}

// ── Category Configuration ───────────────────────────────────────────────────

interface CategoryConfig {
  slug: string
  name: string
  name_ar: string
  icon: string
  sortOrder: number
}

const CATEGORIES: Record<string, CategoryConfig> = {
  agpeya:         { slug: 'agpeya',         name: 'Agpeya (Book of Hours)',          name_ar: 'الأجبية',           icon: 'BookHeart', sortOrder: 1 },
  katameros:      { slug: 'katameros',      name: 'Readings (Katameros)',            name_ar: 'القطمارس',          icon: 'BookText',  sortOrder: 2 },
  liturgy:        { slug: 'liturgy',        name: 'Liturgy',                         name_ar: 'القداس',            icon: 'Church',    sortOrder: 3 },
  psalmody:       { slug: 'psalmody',       name: 'Psalmody',                        name_ar: 'الأبصلمودية',       icon: 'Music2',    sortOrder: 4 },
  hymns:          { slug: 'hymns',          name: 'Hymns & Melodies',                name_ar: 'الألحان والمدائح',  icon: 'Music',     sortOrder: 5 },
  clergy:         { slug: 'clergy',         name: 'Clergy Rites',                    name_ar: 'الكهنوت',           icon: 'Crown',     sortOrder: 6 },
  baptism:        { slug: 'baptism',        name: 'Baptism',                         name_ar: 'المعمودية',         icon: 'Droplets',  sortOrder: 7 },
  crowning:       { slug: 'crowning',       name: 'Crowning (Wedding)',              name_ar: 'الإكليل',           icon: 'Crown',     sortOrder: 8 },
  funeral:        { slug: 'funeral',        name: 'Funeral',                         name_ar: 'الجنازات',          icon: 'Cross',     sortOrder: 9 },
  unction:        { slug: 'unction',        name: 'Unction (Anointing of the Sick)', name_ar: 'القنديل',           icon: 'Heart',     sortOrder: 10 },
  pascha:         { slug: 'pascha',         name: 'Holy Week (Pascha)',              name_ar: 'أسبوع الآلام',      icon: 'Cross',     sortOrder: 11 },
  incense:        { slug: 'incense',        name: 'Raising of Incense',              name_ar: 'رفع بخور',          icon: 'Flame',     sortOrder: 12 },
  consecrations:  { slug: 'consecrations',  name: 'Consecrations',                   name_ar: 'التكريسات',         icon: 'Star',      sortOrder: 13 },
  antiphonary:    { slug: 'antiphonary',    name: 'Antiphonary',                     name_ar: 'الأنتيفونا',        icon: 'Book',      sortOrder: 14 },
  lakkan:         { slug: 'lakkan',         name: 'Lakkan (Foot Washing)',           name_ar: 'اللقان',            icon: 'Droplets',  sortOrder: 15 },
  papal:          { slug: 'papal',          name: 'Papal Rites',                     name_ar: 'طقوس بابوية',       icon: 'Crown',     sortOrder: 16 },
  prostration:    { slug: 'prostration',    name: 'Prostration Prayers',             name_ar: 'صلوات المطانيات',   icon: 'BookOpen',  sortOrder: 17 },
  veneration:     { slug: 'veneration',     name: 'Veneration',                      name_ar: 'التبخير',           icon: 'Flame',     sortOrder: 18 },
}

const DIR_TO_CATEGORY: Record<string, string> = {
  agpeya: 'agpeya',
  liturgies: 'liturgy',
  praises: 'psalmody',
  clergy: 'clergy',
  baptism: 'baptism',
  crowning: 'crowning',
  funeral: 'funeral',
  unction: 'unction',
  pascha: 'pascha',
  raisingOfIncense: 'incense',
  consecrations: 'consecrations',
  antiphonary: 'antiphonary',
  lakkan: 'lakkan',
  papal: 'papal',
  prostration: 'prostration',
  veneration: 'veneration',
}

// ── File Discovery ───────────────────────────────────────────────────────────

interface FileEntry {
  absolutePath: string
  relativePath: string
  slug: string
  sortHint: number
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function discoverFiles(directory: string): FileEntry[] {
  const entries: FileEntry[] = []
  const fullDir = path.join(DATA_DIR, directory)
  if (!fs.existsSync(fullDir)) return entries
  walkDir(fullDir, directory, entries, 0)
  return entries
}

function walkDir(fullDir: string, relDir: string, entries: FileEntry[], sortBase: number): void {
  const items = fs.readdirSync(fullDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))

  let idx = 0
  for (const item of items) {
    if (item.name === 'include') continue
    const fullPath = path.join(fullDir, item.name)
    const relPath = path.join(relDir, item.name)

    if (item.isDirectory()) {
      walkDir(fullPath, relPath, entries, sortBase + idx * 1000)
    } else if (item.name.endsWith('.xml')) {
      entries.push({
        absolutePath: fullPath,
        relativePath: relPath,
        slug: slugify(relPath.replace(/\.xml$/, '')),
        sortHint: sortBase + idx,
      })
      idx++
    }
  }
}

// ── Streaming SQL Writer ─────────────────────────────────────────────────────

class SqlWriter {
  private fd: number
  totalSections = 0
  totalContent = 0
  totalHymns = 0

  constructor(outputPath: string) {
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    this.fd = fs.openSync(outputPath, 'w')
  }

  write(line: string): void {
    fs.writeSync(this.fd, line + '\n')
  }

  writeBlank(): void {
    fs.writeSync(this.fd, '\n')
  }

  close(): void {
    fs.closeSync(this.fd)
  }

  // ── Write helpers for specific record types ─────────────────────────

  writeCategory(cat: CategoryConfig): void {
    const catId = pathToUuid(`category:${cat.slug}`)
    this.write(`INSERT INTO liturgical_categories (id, tradition_id, slug, name, name_ar, icon, sort_order)`)
    this.write(`VALUES (`)
    this.write(`  '${catId}', '${COPTIC_TRADITION_ID}', ${esc(cat.slug)},`)
    this.write(`  ${esc(cat.name)}, ${esc(cat.name_ar)}, ${esc(cat.icon)}, ${cat.sortOrder}`)
    this.write(`) ON CONFLICT (tradition_id, slug) DO UPDATE SET`)
    this.write(`  name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,`)
    this.write(`  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;`)
    this.writeBlank()
  }

  writeSection(
    sectionId: string,
    catId: string,
    slug: string,
    title: string,
    titleAr: string,
    desc: string | null,
    descAr: string | null,
    sortOrder: number,
    metadata: Record<string, unknown>,
  ): void {
    this.write(`INSERT INTO liturgical_sections (id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata)`)
    this.write(`VALUES (`)
    this.write(`  '${sectionId}', '${catId}', ${esc(slug)},`)
    this.write(`  ${esc(title)}, ${esc(titleAr)},`)
    this.write(`  ${esc(desc)}, ${esc(descAr)},`)
    this.write(`  ${sortOrder}, ${escJsonb(metadata)}`)
    this.write(`) ON CONFLICT (category_id, slug) DO UPDATE SET`)
    this.write(`  title = EXCLUDED.title, title_ar = EXCLUDED.title_ar,`)
    this.write(`  description = EXCLUDED.description, description_ar = EXCLUDED.description_ar,`)
    this.write(`  sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata;`)
    this.writeBlank()
    this.totalSections++
  }

  writeContent(
    contentId: string,
    sectionId: string,
    contentType: string,
    title: string | null,
    titleAr: string | null,
    bodyEn: string | null,
    bodyAr: string | null,
    bodyCoptic: string | null,
    sortOrder: number,
    metadata: Record<string, unknown>,
  ): void {
    this.write(`INSERT INTO liturgical_content (id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, sort_order, metadata)`)
    this.write(`VALUES (`)
    this.write(`  '${contentId}', '${sectionId}', ${esc(contentType)},`)
    this.write(`  ${esc(title)}, ${esc(titleAr)},`)
    this.write(`  ${esc(bodyEn)}, ${esc(bodyAr)}, ${esc(bodyCoptic)},`)
    this.write(`  ${sortOrder}, ${escJsonb(metadata)}`)
    this.write(`) ON CONFLICT (id) DO UPDATE SET`)
    this.write(`  content_type = EXCLUDED.content_type, title = EXCLUDED.title, title_ar = EXCLUDED.title_ar,`)
    this.write(`  body_en = EXCLUDED.body_en, body_ar = EXCLUDED.body_ar, body_coptic = EXCLUDED.body_coptic,`)
    this.write(`  sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata, updated_at = now();`)
    this.writeBlank()
    this.totalContent++
  }

  writeHymn(
    id: string,
    title: string,
    titleAr: string | null,
    titleCoptic: string | null,
    lyricsEn: string | null,
    lyricsAr: string | null,
    lyricsCoptic: string | null,
    season: string | null,
    occasion: string | null,
    tags: string[],
    sortOrder: number,
  ): void {
    const tagsLiteral = tags.length > 0
      ? `ARRAY[${tags.map(t => esc(t)).join(', ')}]`
      : `'{}'::text[]`
    this.write(`INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_en, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)`)
    this.write(`VALUES (`)
    this.write(`  '${id}', '${COPTIC_TRADITION_ID}',`)
    this.write(`  ${esc(title)}, ${esc(titleAr)}, ${esc(titleCoptic)},`)
    this.write(`  ${esc(lyricsEn)}, ${esc(lyricsAr)}, ${esc(lyricsCoptic)},`)
    this.write(`  ${esc(season)}, ${esc(occasion)},`)
    this.write(`  ${tagsLiteral}, ${sortOrder}, '{}'::jsonb`)
    this.write(`) ON CONFLICT (id) DO UPDATE SET`)
    this.write(`  title = EXCLUDED.title, title_ar = EXCLUDED.title_ar, title_coptic = EXCLUDED.title_coptic,`)
    this.write(`  lyrics_en = EXCLUDED.lyrics_en, lyrics_ar = EXCLUDED.lyrics_ar, lyrics_coptic = EXCLUDED.lyrics_coptic,`)
    this.write(`  season = EXCLUDED.season, occasion = EXCLUDED.occasion,`)
    this.write(`  tags = EXCLUDED.tags, sort_order = EXCLUDED.sort_order;`)
    this.writeBlank()
    this.totalHymns++
  }
}

// ── Process a single XML file into section + content blocks ──────────────────

function processFile(
  w: SqlWriter,
  fileEntry: FileEntry,
  catId: string,
  sortOrder: number,
): void {
  // Read and resolve
  let xml = readRawXmlFile(fileEntry.absolutePath)
  if (!xml) return

  xml = resolveInserts(xml)

  // Extract document-level title and comment
  const docTitle = extractDocTitle(xml)
  const docComment = extractDocComment(xml)

  const sectionTitle = docTitle.en || path.basename(fileEntry.absolutePath, '.xml')
  const sectionTitleAr = docTitle.ar || ''
  const sectionId = pathToUuid(`section:${fileEntry.relativePath}`)

  w.write(`-- Section: ${sectionTitle.substring(0, 80)}`)
  w.writeSection(
    sectionId,
    catId,
    fileEntry.slug,
    sectionTitle,
    sectionTitleAr,
    docComment?.en || null,
    docComment?.ar || null,
    sortOrder,
    { source_file: fileEntry.relativePath },
  )

  // Extract content blocks
  const blocks = extractBlocks(xml)

  // Skip the first title block if it matches the document title (already captured)
  let startIdx = 0
  if (blocks.length > 0 && blocks[0].type === 'title') {
    const first = blocks[0]
    if (first.text.en === docTitle.en && first.text.ar === docTitle.ar) {
      startIdx = 1
    }
  }

  // Cap blocks to prevent massive duplication from shared includes
  const endIdx = Math.min(blocks.length, startIdx + MAX_BLOCKS_PER_SECTION)
  if (blocks.length > startIdx + MAX_BLOCKS_PER_SECTION) {
    console.warn(`    [CAP] ${fileEntry.relativePath}: ${blocks.length} blocks capped to ${MAX_BLOCKS_PER_SECTION}`)
  }

  for (let bi = startIdx; bi < endIdx; bi++) {
    const block = blocks[bi]
    const contentId = pathToUuid(`content:${fileEntry.relativePath}:${bi}`)
    const contentType = roleToContentType(block.role, block.type)

    const meta: Record<string, unknown> = {}
    if (block.role) meta.role = block.role
    if (block.seasonId) meta.season = block.seasonId
    if (block.verse) meta.verse = block.verse

    w.writeContent(
      contentId,
      sectionId,
      contentType,
      block.title?.en || null,
      block.title?.ar || null,
      block.text.en || null,
      block.text.ar || null,
      block.text.coptic || null,
      bi + 1,
      meta,
    )
  }

  // Free memory after processing each file
  // We keep rawFileCache for includes but clear the resolved content
}

// ── Melodies Processing ──────────────────────────────────────────────────────

function processHymns(w: SqlWriter): void {
  const melodiesDir = path.join(DATA_DIR, 'melodies', 'include')
  if (!fs.existsSync(melodiesDir)) {
    console.warn('[WARN] melodies/include directory not found')
    return
  }

  const files = getAllXmlFiles(melodiesDir)
  console.log(`  Found ${files.length} melody files`)

  let sortOrder = 0
  for (const file of files) {
    const relPath = path.relative(DATA_DIR, file)
    let xml = readRawXmlFile(file)
    if (!xml) continue

    xml = resolveInserts(xml)

    // Title
    const titleMatch = xml.match(/<Title>([\s\S]*?)<\/Title>/i)
    let title: ParsedText = { en: '', ar: '', coptic: '' }
    if (titleMatch) {
      title = extractTrilingualText(titleMatch[1])
    }
    if (!title.en && !title.ar) {
      title.en = path.basename(file, '.xml')
    }

    // Lyrics — concatenate all Text blocks
    const lyricsEn: string[] = []
    const lyricsAr: string[] = []
    const lyricsCoptic: string[] = []

    const textPattern = /<Text(?:\s[^>]*)?>([\s\S]*?)<\/Text>/gi
    let textMatch: RegExpExecArray | null
    while ((textMatch = textPattern.exec(xml)) !== null) {
      const t = extractTrilingualText(textMatch[1])
      if (t.en) lyricsEn.push(t.en)
      if (t.ar) lyricsAr.push(t.ar)
      if (t.coptic) lyricsCoptic.push(t.coptic)
    }

    if (lyricsEn.length === 0 && lyricsAr.length === 0 && lyricsCoptic.length === 0) continue

    // Season/occasion from file path
    const parentDir = path.basename(path.dirname(file))
    let season: string | null = null
    let occasion: string | null = null
    const tags: string[] = ['melody']

    if (parentDir === 'greatfast') { season = 'great-fast'; tags.push('great-fast') }
    else if (parentDir === 'koiahk') { season = 'kiahk'; tags.push('kiahk') }
    else {
      const base = path.basename(file, '.xml').toLowerCase()
      if (base.includes('nativity')) { season = 'nativity'; tags.push('nativity') }
      else if (base.includes('theophany')) { season = 'theophany'; tags.push('theophany') }
      else if (base.includes('resurrection')) { season = 'resurrection'; tags.push('resurrection') }
      else if (base.includes('cross')) { occasion = 'feast-of-the-cross'; tags.push('feast') }
      else if (base.includes('annunciation')) { occasion = 'annunciation'; tags.push('feast') }
      else if (base.includes('apostles')) { occasion = 'apostles'; tags.push('apostles') }
      else if (base.includes('saint')) { tags.push('saints') }
    }

    w.writeHymn(
      pathToUuid(`hymn:${relPath}`),
      title.en,
      title.ar || null,
      title.coptic || null,
      lyricsEn.join('\n\n') || null,
      lyricsAr.join('\n\n') || null,
      lyricsCoptic.join('\n\n') || null,
      season,
      occasion,
      tags,
      sortOrder++,
    )
  }
}

function getAllXmlFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const items = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  for (const item of items) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) results.push(...getAllXmlFiles(full))
    else if (item.name.endsWith('.xml')) results.push(full)
  }
  return results
}

// ── Katameros Readings Processing ────────────────────────────────────────────

function processKatamerosReadings(w: SqlWriter, catId: string): void {
  const readingsDir = path.join(DATA_DIR, 'readings', 'katameros')
  if (!fs.existsSync(readingsDir)) {
    console.warn('[WARN] readings/katameros directory not found')
    return
  }

  const files = fs.readdirSync(readingsDir)
    .filter(f => f.endsWith('.xml'))
    .sort()

  console.log(`  Found ${files.length} reading files`)

  // Group by Bible book
  const bookMap = new Map<string, { ref: string; file: string }[]>()

  for (const file of files) {
    const ref = file.replace(/\.xml$/, '')
    const bookMatch = ref.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+\d/)
    const book = bookMatch ? bookMatch[1].trim() : 'Other'
    if (!bookMap.has(book)) bookMap.set(book, [])
    bookMap.get(book)!.push({ ref, file })
  }

  let bookSort = 0
  for (const [book, refs] of Array.from(bookMap.entries())) {
    const sectionSlug = slugify(`katameros-${book}`)
    const sectionId = pathToUuid(`section:katameros:${book}`)
    bookSort++

    w.write(`-- Katameros: ${book} (${refs.length} readings)`)
    w.writeSection(sectionId, catId, sectionSlug, book, book, null, null, bookSort, { source: 'katameros', book })

    for (let ri = 0; ri < refs.length; ri++) {
      const { ref, file } = refs[ri]
      const filePath = path.join(readingsDir, file)
      const xml = readRawXmlFile(filePath)
      if (!xml) continue

      // Extract all text blocks
      const en: string[] = []
      const ar: string[] = []
      const coptic: string[] = []

      const textPattern = /<Text(?:\s[^>]*)?>([\s\S]*?)<\/Text>/gi
      let m: RegExpExecArray | null
      while ((m = textPattern.exec(xml)) !== null) {
        const t = extractTrilingualText(m[1])
        if (t.en) en.push(t.en)
        if (t.ar) ar.push(t.ar)
        if (t.coptic) coptic.push(t.coptic)
      }

      if (en.length === 0 && ar.length === 0) continue

      w.writeContent(
        pathToUuid(`reading:katameros:${ref}`),
        sectionId,
        'reading',
        ref,
        ref,
        en.join('\n\n') || null,
        ar.join('\n\n') || null,
        coptic.join('\n\n') || null,
        ri + 1,
        { reference: ref },
      )
    }
  }
}

// ── Synaxarion Processing ────────────────────────────────────────────────────

function processSynaxarion(w: SqlWriter, katamerosCatId: string): void {
  const synaxDir = path.join(DATA_DIR, 'readings', 'include', 'synaxarion')
  if (!fs.existsSync(synaxDir)) return

  const files = getAllXmlFiles(synaxDir)
  if (files.length === 0) return

  console.log(`  Found ${files.length} synaxarion entries`)

  const sectionId = pathToUuid('section:synaxarion')
  w.write('-- Synaxarion (Saints of the Day)')
  w.writeSection(sectionId, katamerosCatId, 'synaxarion', 'Synaxarion (Saints of the Day)', 'السنكسار', null, null, 999, { source: 'synaxarion' })

  let sortOrder = 0
  for (const file of files) {
    const xml = readRawXmlFile(file)
    if (!xml) continue

    const relPath = path.relative(DATA_DIR, file)
    const contentId = pathToUuid(`content:synaxarion:${relPath}`)

    const titleMatch = xml.match(/<Title>([\s\S]*?)<\/Title>/i)
    let title: ParsedText = { en: path.basename(file, '.xml'), ar: '', coptic: '' }
    if (titleMatch) {
      const t = extractTrilingualText(titleMatch[1])
      if (t.en || t.ar) title = t
    }

    const en: string[] = []
    const ar: string[] = []
    const textPattern = /<Text(?:\s[^>]*)?>([\s\S]*?)<\/Text>/gi
    let m: RegExpExecArray | null
    while ((m = textPattern.exec(xml)) !== null) {
      const t = extractTrilingualText(m[1])
      if (t.en) en.push(t.en)
      if (t.ar) ar.push(t.ar)
    }

    if (en.length === 0 && ar.length === 0) continue

    sortOrder++
    w.writeContent(
      contentId,
      sectionId,
      'reading',
      title.en || null,
      title.ar || null,
      en.join('\n\n') || null,
      ar.join('\n\n') || null,
      null,
      sortOrder,
      { source_file: relPath },
    )
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('Coptic Reader Data Import')
  console.log('=========================')
  console.log(`Data directory: ${DATA_DIR}`)
  console.log(`Output file:    ${OUTPUT_FILE}`)
  console.log('')

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`ERROR: Data directory not found: ${DATA_DIR}`)
    console.error('Place the Coptic Reader XML data at /tmp/coptic-reader-data/documents/')
    process.exit(1)
  }

  const w = new SqlWriter(OUTPUT_FILE)

  // Header
  w.write('-- ============================================================')
  w.write('-- Coptic Reader Data Import')
  w.write(`-- Generated by: scripts/import-coptic-reader.ts`)
  w.write(`-- Generated at: ${new Date().toISOString()}`)
  w.write('-- Idempotent: uses ON CONFLICT DO UPDATE')
  w.write('-- ============================================================')
  w.writeBlank()
  w.write('BEGIN;')
  w.writeBlank()

  // 1. Tradition
  w.write('-- ─── Tradition ────────────────────────────────────────────')
  w.write(`INSERT INTO liturgical_traditions (id, slug, name, name_ar)`)
  w.write(`VALUES ('${COPTIC_TRADITION_ID}', 'coptic', 'Coptic Orthodox', 'القبطية الأرثوذكسية')`)
  w.write(`ON CONFLICT (slug) DO NOTHING;`)
  w.writeBlank()

  // 2. All categories
  w.write('-- ─── Categories ──────────────────────────────────────────')
  for (const cat of Object.values(CATEGORIES)) {
    w.writeCategory(cat)
  }

  // 3. Process content directories
  const contentDirs = [
    'agpeya', 'liturgies', 'praises', 'clergy', 'baptism', 'crowning',
    'funeral', 'unction', 'pascha', 'raisingOfIncense', 'consecrations',
    'antiphonary', 'lakkan', 'papal', 'prostration', 'veneration',
  ]

  for (const dir of contentDirs) {
    const catSlug = DIR_TO_CATEGORY[dir]
    if (!catSlug) continue
    const catConfig = CATEGORIES[catSlug]
    if (!catConfig) continue
    const catId = pathToUuid(`category:${catConfig.slug}`)

    const fullDir = path.join(DATA_DIR, dir)
    if (!fs.existsSync(fullDir)) {
      console.log(`Skipping ${dir} (not found)`)
      continue
    }

    console.log(`Processing: ${dir} → ${catSlug}`)
    const files = discoverFiles(dir)
    console.log(`  Found ${files.length} files`)

    w.write(`-- ─── ${catConfig.name} (${'─'.repeat(Math.max(1, 50 - catConfig.name.length))})`)
    w.writeBlank()

    for (let fi = 0; fi < files.length; fi++) {
      processFile(w, files[fi], catId, fi + 1)
    }

    // Clear raw file cache periodically to manage memory
    // Keep include files (they are shared), clear document files
    for (const key of Array.from(rawFileCache.keys())) {
      if (!key.includes('/include/')) {
        rawFileCache.delete(key)
      }
    }
  }

  // 4. Katameros readings
  console.log('\nProcessing: readings/katameros')
  const katamerosCatId = pathToUuid(`category:katameros`)
  w.write('-- ─── Katameros Bible Readings ─────────────────────────────')
  w.writeBlank()
  processKatamerosReadings(w, katamerosCatId)

  // 5. Synaxarion
  console.log('\nProcessing: synaxarion')
  processSynaxarion(w, katamerosCatId)

  // 6. Hymns
  console.log('\nProcessing: melodies/hymns')
  w.write('-- ─── Hymns (Melodies) ─────────────────────────────────────')
  w.writeBlank()
  processHymns(w)

  // Commit
  w.writeBlank()
  w.write('COMMIT;')
  w.writeBlank()
  w.write(`-- ============================================================`)
  w.write(`-- Import complete`)
  w.write(`-- Sections:       ${w.totalSections}`)
  w.write(`-- Content blocks: ${w.totalContent}`)
  w.write(`-- Hymns:          ${w.totalHymns}`)
  w.write(`-- ============================================================`)

  w.close()

  // Report
  const stats = fs.statSync(OUTPUT_FILE)
  const sizeMb = (stats.size / 1024 / 1024).toFixed(2)

  console.log(`\n=========================`)
  console.log(`Output:          ${OUTPUT_FILE}`)
  console.log(`File size:       ${sizeMb} MB`)
  console.log(`Sections:        ${w.totalSections}`)
  console.log(`Content blocks:  ${w.totalContent}`)
  console.log(`Hymns:           ${w.totalHymns}`)
  console.log(`Cached files:    ${rawFileCache.size}`)
  console.log(`Missing files:   ${missingFiles.size}`)

  if (missingFiles.size > 0) {
    const sorted = Array.from(missingFiles).sort()
    console.log(`\nMissing files (first 30):`)
    for (const f of sorted.slice(0, 30)) {
      console.log(`  ${f}`)
    }
    if (sorted.length > 30) {
      console.log(`  ... and ${sorted.length - 30} more`)
    }
  }

  console.log('\nTo apply:')
  console.log('  psql $DATABASE_URL < supabase/seeds/coptic-reader-import.sql')
}

main()
