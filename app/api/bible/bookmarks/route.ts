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

  const cols = 'id, profile_id, church_id, bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, note, created_at'

  // Insert, then treat a unique violation as idempotent success. The uniqueness
  // is enforced by a partial/expression index (mig 049: COALESCE(verse_id,'')),
  // which a column-list .upsert(onConflict) cannot match — so we insert and
  // gracefully handle the duplicate instead.
  const { data, error } = await supabase
    .from('bible_bookmarks')
    .insert({
      bible_id,
      book_id,
      chapter_id,
      verse_id: verse_id || null,
      reference_label,
      reference_label_ar: reference_label_ar || null,
      note: note || null,
      profile_id: profile.id,
      church_id: profile.church_id,
    })
    .select(cols)
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already bookmarked — return the existing row (idempotent).
      let q = supabase
        .from('bible_bookmarks')
        .select(cols)
        .eq('profile_id', profile.id)
        .eq('bible_id', bible_id)
        .eq('book_id', book_id)
        .eq('chapter_id', chapter_id)
      q = verse_id ? q.eq('verse_id', verse_id) : q.is('verse_id', null)
      const { data: existing } = await q.single()
      return NextResponse.json({ data: existing }, { status: 200 })
    }
    throw error
  }

  return NextResponse.json({ data }, { status: 201 })
})
