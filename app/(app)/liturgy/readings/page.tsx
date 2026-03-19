import Link from 'next/link'

import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { ChevronLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { ReadingsToday } from '@/components/liturgy/ReadingsToday'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { LectionaryReading } from '@/types'

type PageProps = {
  searchParams: Promise<{ date?: string }>
}

export default async function ReadingsPage({ searchParams }: PageProps) {
  const { date } = await searchParams
  const t = await getTranslations('Liturgy')
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value || 'ar'
  await getCurrentUserWithRole() // auth check
  const supabase = await createClient()

  const targetDate = date || new Date().toISOString().split('T')[0]

  // Get coptic tradition
  const { data: tradition } = await supabase
    .from('liturgical_traditions')
    .select('id')
    .eq('slug', 'coptic')
    .single()

  let reading: LectionaryReading | null = null

  if (tradition) {
    const { data } = await supabase
      .from('lectionary_readings')
      .select('id, tradition_id, reading_date, coptic_date, season, occasion, occasion_ar, readings, synaxarium_en, synaxarium_ar, created_at')
      .eq('tradition_id', tradition.id)
      .eq('reading_date', targetDate)
      .single()

    reading = data as LectionaryReading | null
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
          <h1 className="text-2xl font-bold tracking-tight">{t('readings')}</h1>
          <p className="text-muted-foreground text-sm">{t('readingsSubtitle')}</p>
        </div>
      </div>

      {/* Date picker for navigating to different days */}
      <form className="flex items-end gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Label htmlFor="reading-date" className="text-sm">
            {t('selectDate')}
          </Label>
          <Input
            id="reading-date"
            type="date"
            name="date"
            defaultValue={targetDate}
            className="w-full sm:w-auto text-base"
            dir="ltr"
          />
        </div>
        <Button type="submit" size="sm" className="h-11 shrink-0">
          {t('selectDate')}
        </Button>
      </form>

      <ReadingsToday reading={reading} locale={locale} />
    </div>
  )
}
