import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm'
import { getTranslations } from 'next-intl/server'

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('announcements')
  const supabase = await createClient()

  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (!announcement) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('editAnnouncement')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{announcement.title}</p>
      </div>

      <AnnouncementForm announcement={announcement} />
    </div>
  )
}
