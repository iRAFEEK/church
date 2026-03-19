import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft, FileText } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { SectionList } from '@/components/liturgy/SectionList'
import { Button } from '@/components/ui/button'

import type { LiturgicalSection } from '@/types'

// Categories handled by this dynamic route (others have dedicated pages)
const VALID_CATEGORIES = [
  'katameros',
  'baptism', 'crowning', 'funeral', 'unction', 'pascha',
  'incense', 'consecrations', 'antiphonary', 'lakkan',
  'papal', 'prostration', 'veneration',
]

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  if (!VALID_CATEGORIES.includes(category)) {
    notFound()
  }

  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole()
  const supabase = await createClient()

  const { data: cat } = await supabase
    .from('liturgical_categories')
    .select('id, slug, name, name_ar')
    .eq('slug', category)
    .single()

  if (!cat) notFound()

  const { data } = await supabase
    .from('liturgical_sections')
    .select('id, category_id, slug, title, title_ar, description, description_ar, sort_order, metadata')
    .eq('category_id', cat.id)
    .order('sort_order', { ascending: true })
    .limit(100)

  const sections = (data || []) as LiturgicalSection[]
  const title = locale.startsWith('ar') ? cat.name_ar : cat.name

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="size-11 shrink-0 -ms-2" asChild>
          <Link href="/liturgy" aria-label={t('backToCategories')}>
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{t('noSections')}</h3>
        </div>
      ) : (
        <SectionList
          sections={sections}
          basePath={`/liturgy/${category}`}
          locale={locale}
        />
      )}
    </div>
  )
}
