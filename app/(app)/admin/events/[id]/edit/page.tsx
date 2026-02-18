import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { EventForm } from '@/components/events/EventForm'
import { getTranslations } from 'next-intl/server'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('events')
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('editEventPageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('editEventPageSubtitle')}</p>
      </div>
      <EventForm event={event} />
    </div>
  )
}
