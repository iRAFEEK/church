import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getChapterVerses, getBooks } from '@/lib/bible/queries'
import { BiblePresenter } from '@/components/bible/BiblePresenter'

export default async function BiblePresenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ bibleId: string; chapterId: string }>
  searchParams: Promise<{ verse?: string }>
}) {
  const { chapterId } = await params
  const { verse } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [data, books] = await Promise.all([
    getChapterVerses(chapterId).catch(() => null),
    getBooks().catch(() => []),
  ])

  if (!data || data.verses.length === 0) notFound()

  const bookId = chapterId.split('.')[0]
  const initialVerse = verse ? parseInt(verse, 10) : undefined

  return (
    <BiblePresenter
      bookId={bookId}
      chapterId={chapterId}
      reference={data.reference}
      verses={data.verses}
      books={books}
      initialVerseNum={initialVerse}
    />
  )
}
