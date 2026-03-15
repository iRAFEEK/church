import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateBookmarkSchema } from '@/lib/schemas/bible'

// GET /api/bible/bookmarks — list user's bookmarks
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('bible_bookmarks')
    .select('id, bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, note, created_at')
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error

  return { data }
})

// POST /api/bible/bookmarks — create a bookmark
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const { bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, note } = validate(CreateBookmarkSchema, await req.json())

  // Upsert: DB-1 fix — unique constraint on (profile_id, bible_id, book_id, chapter_id, COALESCE(verse_id, ''))
  // prevents duplicate bookmarks; upsert avoids TOCTOU race on concurrent requests
  const { data, error } = await supabase
    .from('bible_bookmarks')
    .upsert({
      bible_id,
      book_id,
      chapter_id,
      verse_id: verse_id || null,
      reference_label,
      reference_label_ar: reference_label_ar || null,
      note: note || null,
      profile_id: profile.id,
      church_id: profile.church_id,
    }, { onConflict: 'profile_id,bible_id,book_id,chapter_id,verse_id' })
    .select('id, profile_id, church_id, bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, note, created_at')
    .single()

  if (error) throw error

  return NextResponse.json({ data }, { status: 201 })
})
