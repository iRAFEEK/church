import Link from 'next/link'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { SectionList } from '@/components/liturgy/SectionList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type { LiturgicalSection } from '@/types'

// Determine the current Agpeya hour based on time of day
function getCurrentHourSlug(hour: number): string {
  if (hour >= 6 && hour < 9) return 'first-hour'
  if (hour >= 9 && hour < 12) return 'third-hour'
  if (hour >= 12 && hour < 15) return 'sixth-hour'
  if (hour >= 15 && hour < 17) return 'ninth-hour'
  if (hour >= 17 && hour < 21) return 'eleventh-hour'
  if (hour >= 21 && hour < 24) return 'twelfth-hour'
  return 'midnight'
}

export default async function AgpeyaPage() {
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  // Get agpeya category, then its sections
  const { data: category } = await supabase
    .from('liturgical_categories')
    .select('id, slug')
    .eq('slug', 'agpeya')
    .single()

  let sections: LiturgicalSection[] = []

  if (category) {
    const { data } = await supabase
      .from('liturgical_sections')
      .select('id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata')
      .eq('category_id', category.id)
      .order('sort_order', { ascending: true })
      .limit(20)

    sections = (data || []) as LiturgicalSection[]
  }

  const now = new Date()
  const currentHourSlug = getCurrentHourSlug(now.getHours())
  const currentSection = sections.find((s) => s.slug === currentHourSlug)
  const currentLabel = currentSection
    ? locale === 'en'
      ? currentSection.title
      : currentSection.title_ar
    : null

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy" aria-label={t('backToLiturgy')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t('agpeya')}</h1>
          <p className="text-muted-foreground text-sm">{t('agpeyaSubtitle')}</p>
        </div>
      </div>

      {currentLabel && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('currentHour')}:</span>
          <Badge variant="secondary">{currentLabel}</Badge>
        </div>
      )}

      <SectionList
        sections={sections}
        basePath="/liturgy/agpeya"
        locale={locale}
      />
    </div>
  )
}
