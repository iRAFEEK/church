import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft, Presentation } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { PrayerContent } from '@/components/liturgy/PrayerContent'
import { LiturgyNav } from '@/components/liturgy/LiturgyNav'
import { Button } from '@/components/ui/button'

import type { LiturgicalContent, LiturgicalSection } from '@/types'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 50

export default async function LiturgyDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  // Get liturgy category
  const { data: category } = await supabase
    .from('liturgical_categories')
    .select('id')
    .eq('slug', 'liturgy')
    .single()

  if (!category) notFound()

  // Fetch current section and all sibling sections in parallel
  const [sectionResult, allSectionsResult] = await Promise.all([
    supabase
      .from('liturgical_sections')
      .select('id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata')
      .eq('category_id', category.id)
      .eq('slug', slug)
      .single(),
    supabase
      .from('liturgical_sections')
      .select('id, slug, title, title_ar')
      .eq('category_id', category.id)
      .order('sort_order', { ascending: true })
      .limit(20),
  ])

  const section = sectionResult.data as LiturgicalSection | null
  if (!section) notFound()

  const allSections = (allSectionsResult.data || []) as { id: string; slug: string; title: string; title_ar: string }[]

  // Fetch content blocks (paginated)
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: content, count } = await supabase
    .from('liturgical_content')
    .select('id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, audio_url, sort_order, metadata, created_at, updated_at', { count: 'exact' })
    .eq('section_id', section.id)
    .order('sort_order', { ascending: true })
    .range(from, to)

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)
  const title = locale === 'en' ? section.title : section.title_ar

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy/liturgy" aria-label={t('backToLiturgyList')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {section.description && (
            <p className="text-muted-foreground text-sm">
              {locale === 'en' ? section.description : section.description_ar}
            </p>
          )}
        </div>
        <Button variant="outline" size="icon" className="size-11 shrink-0" asChild>
          <Link href={`/presenter/liturgy/${section.id}`} aria-label={t('present')}>
            <Presentation className="size-5" />
          </Link>
        </Button>
      </div>

      {/* Navigation between liturgy sections */}
      <LiturgyNav
        sections={allSections}
        currentSlug={slug}
        basePath="/liturgy/liturgy"
        locale={locale}
      />

      <PrayerContent
        content={(content || []) as LiturgicalContent[]}
        locale={locale}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Button variant="outline" size="sm" className="h-11" asChild>
              <Link href={`/liturgy/liturgy/${slug}?page=${page - 1}`}>
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
              <Link href={`/liturgy/liturgy/${slug}?page=${page + 1}`}>
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
