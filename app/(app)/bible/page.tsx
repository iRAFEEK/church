import { getTranslations } from 'next-intl/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { getBooks, getAllChaptersMap } from '@/lib/bible/queries'
import { BibleReader } from '@/components/bible/BibleReader'

export default async function BiblePage() {
  const t = await getTranslations('bible')
  const { profile, church } = await getCurrentUserWithRole()

  const bibleId = profile.preferred_bible_id || church.default_bible_id || 'ar-svd'

  const [books, chaptersMap] = await Promise.all([
    getBooks(bibleId).catch(() => []),
    getAllChaptersMap(bibleId).catch(() => ({})),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('pageSubtitle')}</p>
      </div>

      <BibleReader
        books={books}
        chaptersMap={chaptersMap}
        initialBibleId={bibleId}
      />
    </div>
  )
}
