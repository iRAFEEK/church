import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EventForm } from '@/components/events/EventForm'
import { getTranslations } from 'next-intl/server'

export default async function NewEventPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('events')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newEventPageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newEventPageSubtitle')}</p>
      </div>
      <EventForm />
    </div>
  )
}
