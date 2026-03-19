import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { CategoryGrid } from '@/components/liturgy/CategoryGrid'

export default async function LiturgyPage() {
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  // Get coptic tradition
  const { data: tradition } = await supabase
    .from('liturgical_traditions')
    .select('id, slug, name, name_ar')
    .eq('slug', 'coptic')
    .single()

  if (!tradition) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
        <CategoryGrid categories={[]} locale={locale} />
      </div>
    )
  }

  const { data: categories } = await supabase
    .from('liturgical_categories')
    .select('id, tradition_id, slug, name, name_ar, icon, sort_order')
    .eq('tradition_id', tradition.id)
    .order('sort_order', { ascending: true })
    .limit(20)

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>
      <CategoryGrid categories={categories || []} locale={locale} />
    </div>
  )
}
