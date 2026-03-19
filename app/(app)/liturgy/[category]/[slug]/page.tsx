import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft, Presentation } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { PrayerContent } from '@/components/liturgy/PrayerContent'
import { Button } from '@/components/ui/button'

import type { LiturgicalContent, LiturgicalSection } from '@/types'

const PAGE_SIZE = 100

export default async function CategorySectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { category, slug } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10))

  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole()
  const supabase = await createClient()

  // Get category first
  const { data: cat } = await supabase
    .from('liturgical_categories')
    .select('id, slug, name, name_ar')
    .eq('slug', category)
    .single()

  if (!cat) notFound()

  // Get the section by slug within this category
  const { data: section } = await supabase
    .from('liturgical_sections')
    .select('id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata')
    .eq('category_id', cat.id)
    .eq('slug', slug)
    .single()

  if (!section) notFound()

  const offset = (page - 1) * PAGE_SIZE

  const { data: content, count } = await supabase
    .from('liturgical_content')
    .select('id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, audio_url, sort_order, metadata', { count: 'exact' })
    .eq('section_id', section.id)
    .order('sort_order', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  const sectionData = section as LiturgicalSection
  const contentData = (content || []) as LiturgicalContent[]
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)
  const sectionTitle = locale.startsWith('ar')
    ? sectionData.title_ar || sectionData.title
    : sectionData.title

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href={`/liturgy/${category}`} aria-label={t('backToCategories')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{sectionTitle}</h1>
          {sectionData.description_ar && locale.startsWith('ar') && (
            <p className="text-muted-foreground text-sm mt-1">{sectionData.description_ar}</p>
          )}
          {sectionData.description && !locale.startsWith('ar') && (
            <p className="text-muted-foreground text-sm mt-1">{sectionData.description}</p>
          )}
        </div>
        <Button variant="outline" size="icon" className="size-11 shrink-0" asChild>
          <Link href={`/presenter/liturgy/${section.id}`} aria-label={t('presentMode')}>
            <Presentation className="size-5" />
          </Link>
        </Button>
      </div>

      <PrayerContent content={contentData} locale={locale} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/liturgy/${category}/${slug}?page=${page - 1}`}>
                <ChevronLeft className="size-4 rtl:rotate-180 me-1" />
                {t('page')} {page - 1}
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground" dir="ltr">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/liturgy/${category}/${slug}?page=${page + 1}`}>
                {t('page')} {page + 1}
                <ChevronLeft className="size-4 rtl:-rotate-180 ms-1 rotate-180" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
