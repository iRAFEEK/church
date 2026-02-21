import { getTranslations } from 'next-intl/server'
import { getBooks, getAllChaptersMap } from '@/lib/bible/queries'
import { BibleReader } from '@/components/bible/BibleReader'

export default async function BiblePage() {
  const t = await getTranslations('bible')

  const [books, chaptersMap] = await Promise.all([
    getBooks().catch(() => []),
    getAllChaptersMap().catch(() => ({})),
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
      />
    </div>
  )
}
