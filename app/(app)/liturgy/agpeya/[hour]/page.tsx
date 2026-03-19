import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { PrayerContent } from '@/components/liturgy/PrayerContent'
import { Button } from '@/components/ui/button'

import type { LiturgicalContent } from '@/types'

type PageProps = {
  params: Promise<{ hour: string }>
}

export default async function AgpeyaHourPage({ params }: PageProps) {
  const { hour } = await params
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  // Get agpeya category first
  const { data: category } = await supabase
    .from('liturgical_categories')
    .select('id')
    .eq('slug', 'agpeya')
    .single()

  if (!category) notFound()

  // Get the section by slug
  const { data: section } = await supabase
    .from('liturgical_sections')
    .select('id, slug, title, title_ar, description, description_ar')
    .eq('category_id', category.id)
    .eq('slug', hour)
    .single()

  if (!section) notFound()

  // Get content blocks for this section
  const { data: content } = await supabase
    .from('liturgical_content')
    .select('id, section_id, content_type, title, title_ar, body_en, body_ar, body_coptic, audio_url, sort_order, metadata, created_at, updated_at')
    .eq('section_id', section.id)
    .order('sort_order', { ascending: true })
    .limit(200)

  const title = locale === 'en' ? section.title : section.title_ar

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy/agpeya" aria-label={t('backToAgpeya')}>
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
      </div>

      <PrayerContent
        content={(content || []) as LiturgicalContent[]}
        locale={locale}
      />
    </div>
  )
}
