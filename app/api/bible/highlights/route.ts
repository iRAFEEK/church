import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateHighlightSchema } from '@/lib/schemas/bible'

// GET /api/bible/highlights — list user's highlights, optional ?chapter_id= filter
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const chapterId = searchParams.get('chapter_id')

  let query = supabase
    .from('bible_highlights')
    .select('id, bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, color, created_at')
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)

  if (chapterId) {
    query = query.eq('chapter_id', chapterId)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(500)

  if (error) throw error

  return { data }
})

// POST /api/bible/highlights — create or upsert a highlight
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const { bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, color } = validate(CreateHighlightSchema, await req.json())

  const { data, error } = await supabase
    .from('bible_highlights')
    .upsert(
      {
        bible_id,
        book_id,
        chapter_id,
        verse_id,
        reference_label,
        reference_label_ar: reference_label_ar || null,
        color,
        profile_id: profile.id,
        church_id: profile.church_id,
      },
      { onConflict: 'profile_id,verse_id,bible_id' }
    )
    .select('id, profile_id, church_id, bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, color, created_at')
    .single()

  if (error) throw error

  return NextResponse.json({ data }, { status: 201 })
})
