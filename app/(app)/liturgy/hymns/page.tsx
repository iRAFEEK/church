import Link from 'next/link'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft, Music } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { HymnCard } from '@/components/liturgy/HymnCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

import type { Hymn } from '@/types'

type PageProps = {
  searchParams: Promise<{ q?: string; season?: string; page?: string }>
}

const PAGE_SIZE = 25

export default async function HymnsPage({ searchParams }: PageProps) {
  const { q, season, page: pageParam } = await searchParams
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Build query
  let query = supabase
    .from('hymns')
    .select('id, tradition_id, title, title_ar, audio_url, season, tags, sort_order, created_at', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })
    .range(from, to)

  if (q) {
    const safe = sanitizeLikePattern(q)
    query = query.or(`title.ilike.%${safe}%,title_ar.ilike.%${safe}%`)
  }

  if (season) {
    query = query.eq('season', season)
  }

  // Fetch hymns and distinct seasons in parallel
  const [hymnsResult, seasonsResult] = await Promise.all([
    query,
    supabase
      .from('hymns')
      .select('season')
      .not('season', 'is', null)
      .limit(50),
  ])

  const hymns = (hymnsResult.data || []) as Hymn[]
  const count = hymnsResult.count || 0
  const totalPages = Math.ceil(count / PAGE_SIZE)

  // Extract unique seasons
  const uniqueSeasons = [...new Set(
    (seasonsResult.data || [])
      .map((r: { season: string | null }) => r.season)
      .filter(Boolean) as string[]
  )].sort()

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy" aria-label={t('backToLiturgy')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t('hymns')}</h1>
          <p className="text-muted-foreground text-sm">{t('hymnsSubtitle')}</p>
        </div>
      </div>

      {/* Search and filter form */}
      <form className="flex flex-col sm:flex-row gap-3">
        <Input
          type="search"
          name="q"
          defaultValue={q || ''}
          placeholder={t('searchHymns')}
          className="flex-1 text-base h-11"
          dir="auto"
        />
        <select
          name="season"
          defaultValue={season || ''}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-auto"
        >
          <option value="">{t('allSeasons')}</option>
          {uniqueSeasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" className="h-11 shrink-0">
          {t('searchHymns')}
        </Button>
      </form>

      {/* Hymn list */}
      {hymns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Music className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{t('noHymns')}</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {hymns.map((hymn) => (
            <HymnCard key={hymn.id} hymn={hymn} locale={locale} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <Link
                href={`/liturgy/hymns?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(season ? { season } : {}),
                  page: String(page - 1),
                }).toString()}`}
              >
                <ChevronLeft className="size-4 me-1 rtl:rotate-180" />
                {t('page')} {page - 1}
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground" dir="ltr">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <Link
                href={`/liturgy/hymns?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(season ? { season } : {}),
                  page: String(page + 1),
                }).toString()}`}
              >
                {t('page')} {page + 1}
                <ChevronLeft className="size-4 ms-1 rotate-180 rtl:rotate-0" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
