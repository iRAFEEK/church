import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { findLesson, canSee } from '@/lib/help/guide-data'
import { GuideLessonView } from '@/components/help/GuideLessonView'

type Params = { params: Promise<{ id: string }> }

export default async function HelpLessonPage({ params }: Params) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const hit = findLesson(id)
  if (!hit || !canSee(user.profile.role, hit.lesson.minRole)) redirect('/help')

  const [t, locale] = await Promise.all([getTranslations('helpGuide'), getLocale()])
  const isAr = locale.startsWith('ar')
  const { lesson, category } = hit

  // Next lesson within the same category (role-filtered) for a gentle "keep going".
  const visible = category.lessons.filter(l => canSee(user.profile.role, l.minRole))
  const idx = visible.findIndex(l => l.id === lesson.id)
  const next = idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : null

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      <Link href="/help" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 min-h-[44px]">
        <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
        {t('backToLibrary')}
      </Link>

      <GuideLessonView lesson={lesson} />

      {next && (
        <Link
          href={`/help/${next.id}`}
          className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-4 min-h-[56px] hover:bg-amber-100 transition-colors"
        >
          <span className="text-2xl" aria-hidden>{next.icon}</span>
          <span className="flex-1">
            <span className="block text-xs text-amber-700 font-medium">{t('nextLesson')}</span>
            <span className="block text-sm font-semibold text-zinc-900" dir={isAr ? 'rtl' : 'auto'}>
              {!isAr && next.titleEn ? next.titleEn : next.title}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-amber-500 rtl:rotate-180" />
        </Link>
      )}
    </div>
  )
}
