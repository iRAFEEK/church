import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { GUIDE, canSee } from '@/lib/help/guide-data'
import { GuideLibrary } from '@/components/help/GuideLibrary'

export default async function HelpPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('helpGuide')
  const role = user.profile.role

  // Role-filter server-side: users never see categories/lessons above their role.
  const categories = GUIDE
    .filter(c => canSee(role, c.minRole))
    .map(c => ({ ...c, lessons: c.lessons.filter(l => canSee(role, l.minRole)) }))
    .filter(c => c.lessons.length > 0)

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <span aria-hidden>📖</span> {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{t('subtitle')}</p>
      </div>
      <GuideLibrary categories={categories} />
    </div>
  )
}
