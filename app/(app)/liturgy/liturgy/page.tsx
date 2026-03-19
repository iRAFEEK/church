import Link from 'next/link'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { SectionList } from '@/components/liturgy/SectionList'
import { Button } from '@/components/ui/button'

import type { LiturgicalSection } from '@/types'

export default async function LiturgySelectionPage() {
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  // Get liturgy category, then its sections
  const { data: category } = await supabase
    .from('liturgical_categories')
    .select('id, slug')
    .eq('slug', 'liturgy')
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

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy" aria-label={t('backToLiturgy')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t('liturgy')}</h1>
          <p className="text-muted-foreground text-sm">{t('liturgySubtitle')}</p>
        </div>
      </div>

      <SectionList
        sections={sections}
        basePath="/liturgy/liturgy"
        locale={locale}
      />
    </div>
  )
}
