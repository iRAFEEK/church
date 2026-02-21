import { createAdminClient } from '@/lib/supabase/server'
import type {
  ApiBibleBook, ApiBibleChapter,
  ApiBibleChapterContent, ApiBibleVerse,
} from '@/types'

const BIBLE_ID = 'ar-svd'

// ============================================================
// Public query functions — optimized for single Arabic SVD version
// ============================================================

/**
 * Get all books for Arabic SVD.
 */
export async function getBooks(): Promise<ApiBibleBook[]> {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('bible_books')
    .select('id, abbreviation, name, name_long, sort_order')
    .eq('bible_id', BIBLE_ID)
    .order('sort_order')

  return (data || []).map((b: any) => ({
    id: b.id,
    bibleId: BIBLE_ID,
    abbreviation: b.abbreviation,
    name: b.name,
    nameLong: b.name_long,
  }))
}

/**
 * Get ALL chapters for Arabic SVD, grouped by book_id.
 * Returns a flat map: { [bookId]: [{ id, number }] }
 * This eliminates the need for per-book chapter fetches.
 */
export async function getAllChaptersMap(): Promise<Record<string, { id: string; number: string }[]>> {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('bible_chapters')
    .select('id, book_id, chapter_number')
    .eq('bible_id', BIBLE_ID)
    .order('chapter_number')

  const map: Record<string, { id: string; number: string }[]> = {}
  for (const c of data || []) {
    const bookId = (c as any).book_id
    if (!map[bookId]) map[bookId] = []
    map[bookId].push({ id: (c as any).id, number: String((c as any).chapter_number) })
  }
  return map
}

/**
 * Get chapters for a specific book (used by API routes / presenter).
 */
export async function getChapters(bookId: string): Promise<ApiBibleChapter[]> {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('bible_chapters')
    .select('id, book_id, chapter_number, reference')
    .eq('bible_id', BIBLE_ID)
    .eq('book_id', bookId)
    .order('chapter_number')

  return (data || []).map((c: any) => ({
    id: c.id,
    bibleId: BIBLE_ID,
    bookId: c.book_id,
    number: String(c.chapter_number),
    reference: c.reference,
  }))
}

/**
 * Get the content of a chapter, building HTML with data-verse-id spans.
 */
export async function getChapterContent(chapterId: string): Promise<ApiBibleChapterContent> {
  const supabase = await createAdminClient()

  const [chapterResult, versesResult] = await Promise.all([
    supabase
      .from('bible_chapters')
      .select('book_id, chapter_number, reference')
      .eq('bible_id', BIBLE_ID)
      .eq('id', chapterId)
      .single(),
    supabase
      .from('bible_verses')
      .select('id, verse_number, text')
      .eq('bible_id', BIBLE_ID)
      .eq('chapter_id', chapterId)
      .order('verse_number'),
  ])

  const chapter = chapterResult.data
  const verses = versesResult.data || []

  const html = verses.map((v: any) =>
    `<span data-verse-id="${escapeAttr(v.id)}" class="v">`
    + `<sup class="verse-num">${v.verse_number}</sup> ${escapeHtml(v.text)}`
    + `</span>`
  ).join(' ')

  const content = `<div class="chapter">${html}</div>`

  return {
    id: chapterId,
    bibleId: BIBLE_ID,
    bookId: chapter?.book_id || chapterId.split('.')[0],
    number: String(chapter?.chapter_number || ''),
    reference: chapter?.reference || '',
    content,
    verseCount: verses.length,
    copyright: '',
  }
}

/**
 * Get individual verses for a chapter (used by presenter).
 */
export async function getChapterVerses(chapterId: string): Promise<{
  verses: { id: string; verse_number: number; text: string }[]
  reference: string
}> {
  const supabase = await createAdminClient()

  const [chapterResult, versesResult] = await Promise.all([
    supabase
      .from('bible_chapters')
      .select('reference')
      .eq('bible_id', BIBLE_ID)
      .eq('id', chapterId)
      .single(),
    supabase
      .from('bible_verses')
      .select('id, verse_number, text')
      .eq('bible_id', BIBLE_ID)
      .eq('chapter_id', chapterId)
      .order('verse_number'),
  ])

  return {
    verses: (versesResult.data || []).map((v: any) => ({
      id: v.id,
      verse_number: v.verse_number,
      text: v.text,
    })),
    reference: chapterResult.data?.reference || chapterId,
  }
}

/**
 * Normalize Arabic text for search: strip tashkeel + normalize alef variants.
 */
function normalizeArabic(text: string): string {
  return text
    // Remove tashkeel (diacritical marks)
    .replace(/[\u064B-\u065F\u0610-\u061A\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0640]/g, '')
    // Normalize alef variants to plain alef
    .replace(/[ٱأإآ]/g, 'ا')
}

/**
 * Fast Bible search using ILIKE for instant results.
 * Splits query into words and matches each independently (AND logic).
 */
export async function searchBible(
  query: string,
  limit: number = 10
): Promise<{ verses: ApiBibleVerse[]; total: number }> {
  const supabase = await createAdminClient()

  const normalized = normalizeArabic(query.trim())
  const words = normalized.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return { verses: [], total: 0 }

  let q = supabase
    .from('bible_verses')
    .select('id, book_id, chapter_id, verse_number, text')
    .eq('bible_id', BIBLE_ID)

  // Each word must appear somewhere in text_plain (AND logic)
  for (const word of words) {
    q = q.ilike('text_plain', `%${word}%`)
  }

  const { data } = await q.limit(limit)

  const verses: ApiBibleVerse[] = (data || []).map((v: any) => ({
    id: v.id,
    orgId: v.id,
    bibleId: BIBLE_ID,
    bookId: v.book_id,
    chapterId: v.chapter_id,
    reference: `${v.chapter_id}:${v.verse_number}`,
    content: v.text,
    copyright: '',
  }))

  return { verses, total: verses.length }
}

// ============================================================
// Helpers
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;')
}
