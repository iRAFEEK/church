import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm'
import { getTranslations } from 'next-intl/server'

export default async function NewAnnouncementPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('announcements')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newAnnouncement')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newAnnouncementSubtitle')}</p>
      </div>

      <AnnouncementForm />
    </div>
  )
}
