/**
 * Import Tasbe7na songs from extracted JSON into Supabase songs table.
 * Songs are inserted as GLOBAL (church_id = NULL) so all churches can access them.
 * Run: npx tsx scripts/seed-songs.ts
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * Data: data/songs/tasbe7na.json (produced by scripts/extract-songs.ts)
 */

import { readFileSync } from 'fs'
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

interface ExportedSong {
  title_ar: string
  lyrics_ar: string | null
  language: string
  extracted_at: string
}

const DEFAULT_DISPLAY_SETTINGS = {
  bg_color: '#000000',
  bg_image: null,
  text_color: '#ffffff',
  font_family: 'arabic',
  font_size: 48,
}

async function main() {
  const dataPath = join(process.cwd(), 'data/songs/tasbe7na.json')
  const songs: ExportedSong[] = JSON.parse(readFileSync(dataPath, 'utf-8'))
  console.log(`Loaded ${songs.length} songs from JSON`)
  console.log('Inserting as GLOBAL songs (church_id = NULL) — accessible by all churches')

  // Fetch existing global song titles for idempotency
  console.log('Checking existing global songs...')
  const { data: existing, error: existErr } = await supabase
    .from('songs')
    .select('title_ar')
    .is('church_id', null)

  if (existErr) {
    console.error('Error fetching existing songs:', existErr.message)
    process.exit(1)
  }

  const existingTitles = new Set((existing || []).map(s => s.title_ar))
  console.log(`Found ${existingTitles.size} existing global songs`)

  // Filter out duplicates
  const newSongs = songs.filter(s => !existingTitles.has(s.title_ar))
  console.log(`New songs to import: ${newSongs.length}`)

  if (newSongs.length === 0) {
    console.log('No new songs to import. All songs already exist.')
    return
  }

  // Batch insert
  const BATCH_SIZE = 50
  let inserted = 0

  for (let i = 0; i < newSongs.length; i += BATCH_SIZE) {
    const batch = newSongs.slice(i, i + BATCH_SIZE).map(song => ({
      church_id: null,
      created_by: null,
      title: song.title_ar,
      title_ar: song.title_ar,
      artist: null,
      artist_ar: null,
      lyrics: null,
      lyrics_ar: song.lyrics_ar,
      tags: ['tasbe7na', 'ترنيمة'],
      display_settings: DEFAULT_DISPLAY_SETTINGS,
      is_active: true,
    }))

    const { error } = await supabase.from('songs').insert(batch)
    if (error) {
      console.error(`Error inserting batch at offset ${i}:`, error.message)
      console.error('Continuing with next batch...')
      continue
    }

    inserted += batch.length
    const pct = Math.round((inserted / newSongs.length) * 100)
    process.stdout.write(`\r  Inserted: ${inserted}/${newSongs.length} (${pct}%)`)
  }

  console.log(`\n\nDone! Imported ${inserted} global songs accessible by all churches.`)
}

main().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
