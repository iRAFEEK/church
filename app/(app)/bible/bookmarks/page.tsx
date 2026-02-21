import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { BookmarksPageClient } from './BookmarksPageClient'

export default async function BookmarksPage() {
  const { profile, church } = await getCurrentUserWithRole()
  const t = await getTranslations('bible')
  const supabase = await createClient()

  const { data: bookmarks } = await supabase
    .from('bible_bookmarks')
    .select('*')
    .eq('profile_id', (profile as any).id)
    .eq('church_id', (church as any).id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('bookmarks')}</h1>
        <p className="text-muted-foreground text-sm">{t('viewBookmarks')}</p>
      </div>

      <BookmarksPageClient initialBookmarks={bookmarks || []} />
    </div>
  )
}
