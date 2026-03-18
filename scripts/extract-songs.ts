/**
 * Extract songs from Tasbe7na's bundled SQLite database and save as JSON.
 * Run: npx tsx scripts/extract-songs.ts
 *
 * Expects: data/songs/apk-contents/assets/flutter_assets/lib/src/db/data/db.sqlite
 * Produces: data/songs/tasbe7na.json
 *
 * Database hierarchy:
 *   songs → items (via item_id) → verses → slides → segments
 *   - segments contain individual lines of text
 *   - slides group segments into visual slides
 *   - verses group slides into sections (chorus=type 1, verse=type 0/null)
 */

import Database from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { join } from 'path'

const DB_PATH = join(
  process.cwd(),
  'data/songs/apk-contents/assets/flutter_assets/lib/src/db/data/db.sqlite'
)
const OUTPUT_PATH = join(process.cwd(), 'data/songs/tasbe7na.json')

interface SongRow {
  id: number
  item_id: number
  title: string
  language: number
  dialect: number | null
}

interface VerseRow {
  id: number
  item_id: number
  type: number | null
}

interface SlideRow {
  id: number
  heading: string | null
  verse: number
}

interface SegmentRow {
  id: number
  slide: number
  content: string
}

interface ExportedSong {
  title_ar: string
  lyrics_ar: string | null
  language: string
  extracted_at: string
}

function main() {
  console.log('Opening database...')
  const db = new Database(DB_PATH, { readonly: true })

  // Get all songs
  const songs = db.prepare('SELECT id, item_id, title, language, dialect FROM songs ORDER BY id').all() as SongRow[]
  console.log(`Found ${songs.length} songs`)

  // Pre-fetch all verses, slides, and segments for efficiency
  console.log('Loading verses...')
  const allVerses = db.prepare('SELECT id, item_id, type FROM verses ORDER BY id').all() as VerseRow[]
  const versesByItem = new Map<number, VerseRow[]>()
  for (const v of allVerses) {
    const list = versesByItem.get(v.item_id) || []
    list.push(v)
    versesByItem.set(v.item_id, list)
  }

  console.log('Loading slides...')
  const allSlides = db.prepare('SELECT id, heading, verse FROM slides ORDER BY id').all() as SlideRow[]
  const slidesByVerse = new Map<number, SlideRow[]>()
  for (const s of allSlides) {
    const list = slidesByVerse.get(s.verse) || []
    list.push(s)
    slidesByVerse.set(s.verse, list)
  }

  console.log('Loading segments...')
  const allSegments = db.prepare('SELECT id, slide, content FROM segments ORDER BY id').all() as SegmentRow[]
  const segmentsBySlide = new Map<number, SegmentRow[]>()
  for (const seg of allSegments) {
    const list = segmentsBySlide.get(seg.slide) || []
    list.push(seg)
    segmentsBySlide.set(seg.slide, list)
  }

  console.log('Reconstructing lyrics...')
  const exported: ExportedSong[] = []
  let truncated = 0
  let empty = 0

  for (const song of songs) {
    const verses = versesByItem.get(song.item_id) || []
    if (verses.length === 0) {
      empty++
      exported.push({
        title_ar: song.title,
        lyrics_ar: null,
        language: song.language === 1 ? 'ar' : song.language === 2 ? 'en' : 'other',
        extracted_at: new Date().toISOString(),
      })
      continue
    }

    const verseSections: string[] = []
    let verseCounter = 0

    for (const verse of verses) {
      const slides = slidesByVerse.get(verse.id) || []
      const slideLines: string[] = []

      for (const slide of slides) {
        const segments = segmentsBySlide.get(slide.id) || []
        const lineText = segments.map(seg => seg.content).join('\n')
        if (lineText.trim()) {
          slideLines.push(lineText)
        }
      }

      if (slideLines.length === 0) continue

      // Add verse/chorus marker
      let marker = ''
      if (verse.type === 1) {
        marker = '(ق)\n' // Chorus
      } else if (verse.type === 0 || verse.type === null) {
        verseCounter++
        // Only add number marker if there are multiple non-chorus verses
        if (verses.filter(v => v.type === 0 || v.type === null).length > 1) {
          marker = `(${verseCounter})\n`
        }
      } else if (verse.type === 4) {
        marker = '' // Bridge/intro — no marker
      }

      verseSections.push(marker + slideLines.join('\n'))
    }

    let lyrics = verseSections.join('\n\n')

    // Truncate if over 10,000 chars (Zod schema limit)
    if (lyrics.length > 10000) {
      truncated++
      const lines = lyrics.substring(0, 10000).split('\n')
      lines.pop() // Remove potentially incomplete last line
      lyrics = lines.join('\n')
    }

    exported.push({
      title_ar: song.title,
      lyrics_ar: lyrics || null,
      language: song.language === 1 ? 'ar' : song.language === 2 ? 'en' : 'other',
      extracted_at: new Date().toISOString(),
    })
  }

  db.close()

  writeFileSync(OUTPUT_PATH, JSON.stringify(exported, null, 2), 'utf-8')

  console.log(`\nDone!`)
  console.log(`  Total songs: ${exported.length}`)
  console.log(`  With lyrics: ${exported.filter(s => s.lyrics_ar).length}`)
  console.log(`  Empty lyrics: ${empty}`)
  console.log(`  Truncated (>10k chars): ${truncated}`)
  console.log(`  Output: ${OUTPUT_PATH}`)
}

main()
