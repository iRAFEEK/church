/**
 * Seed Bible data from local JSON files into Supabase via REST API.
 * Run: npx tsx scripts/seed-bible.ts
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * Data files: data/bible/ar-svd.json, data/bible/en-kjva.json
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface BibleVerse {
  number: number
  text: string
}

interface BibleChapter {
  number: number
  reference: string
  verses: BibleVerse[]
}

interface BibleBook {
  id: string
  abbreviation: string
  name: string
  nameLong: string
  sortOrder: number
  chapters: BibleChapter[]
}

interface BibleData {
  version: {
    id: string
    name: string
    nameLocal: string
    abbreviation: string
    abbreviationLocal: string
    languageId: string
    languageName: string
    languageNameLocal: string
    description: string
    descriptionLocal: string
    copyright: string
  }
  books: BibleBook[]
}

// Batch insert helper — Supabase REST has payload limits, so chunk inserts
async function batchInsert(table: string, rows: any[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      throw new Error(`Insert into ${table} failed at batch ${i}: ${error.message}`)
    }
  }
}

async function seedVersion(data: BibleData) {
  const v = data.version

  console.log(`\nSeeding ${v.name} (${v.id})...`)

  // Delete existing data for this version (cascade will handle related tables)
  await supabase.from('bible_verses').delete().eq('bible_id', v.id)
  await supabase.from('bible_chapters').delete().eq('bible_id', v.id)
  await supabase.from('bible_books').delete().eq('bible_id', v.id)
  await supabase.from('bible_versions').delete().eq('id', v.id)

  // Insert version
  const { error: vErr } = await supabase.from('bible_versions').insert({
    id: v.id,
    name: v.name,
    name_local: v.nameLocal,
    abbreviation: v.abbreviation,
    abbreviation_local: v.abbreviationLocal,
    language_id: v.languageId,
    language_name: v.languageName,
    language_name_local: v.languageNameLocal,
    description: v.description,
    description_local: v.descriptionLocal,
    copyright: v.copyright,
  })
  if (vErr) throw new Error(`Version insert failed: ${vErr.message}`)

  let totalBooks = 0
  let totalChapters = 0
  let totalVerses = 0

  // Collect all rows first, then batch insert
  const bookRows: any[] = []
  const chapterRows: any[] = []
  const verseRows: any[] = []

  for (const book of data.books) {
    bookRows.push({
      id: book.id,
      bible_id: v.id,
      abbreviation: book.abbreviation,
      name: book.name,
      name_long: book.nameLong,
      sort_order: book.sortOrder,
    })
    totalBooks++

    for (const chapter of book.chapters) {
      const chapterId = `${book.id}.${chapter.number}`
      chapterRows.push({
        id: chapterId,
        bible_id: v.id,
        book_id: book.id,
        chapter_number: chapter.number,
        reference: chapter.reference,
      })
      totalChapters++

      for (const verse of chapter.verses) {
        const verseId = `${book.id}.${chapter.number}.${verse.number}`
        verseRows.push({
          id: verseId,
          bible_id: v.id,
          book_id: book.id,
          chapter_id: chapterId,
          verse_number: verse.number,
          text: verse.text,
        })
        totalVerses++
      }
    }
  }

  // Insert books
  console.log(`  Inserting ${totalBooks} books...`)
  await batchInsert('bible_books', bookRows, 100)

  // Insert chapters
  console.log(`  Inserting ${totalChapters} chapters...`)
  await batchInsert('bible_chapters', chapterRows, 200)

  // Insert verses (the big one)
  console.log(`  Inserting ${totalVerses} verses (this may take a minute)...`)
  await batchInsert('bible_verses', verseRows, 500)

  console.log(`  Done: ${totalBooks} books, ${totalChapters} chapters, ${totalVerses} verses`)
}

async function main() {
  const dataDir = join(process.cwd(), 'data', 'bible')
  const files = ['ar-svd.json', 'en-kjva.json']

  for (const file of files) {
    const filePath = join(dataDir, file)
    if (!existsSync(filePath)) {
      console.warn(`Warning: ${file} not found in data/bible/. Skipping.`)
      continue
    }

    const data: BibleData = JSON.parse(readFileSync(filePath, 'utf-8'))
    await seedVersion(data)
  }

  console.log('\nDone! Bible data has been seeded.')
}

main().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
