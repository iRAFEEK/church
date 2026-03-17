import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { BookingCalendar } from '@/components/locations/BookingCalendar'

export default async function BookingsPage() {
  const user = await getCurrentUserWithRole()
  const t = await getTranslations('bookings')

  if (!user.resolvedPermissions.can_book_locations) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, name_ar')
    .eq('church_id', user.profile.church_id)
    .eq('is_active', true)
    .order('name')
    .limit(100)

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
      </div>

      <BookingCalendar
        locations={locations ?? []}
        currentUserId={user.profile.id}
        isSuperAdmin={user.profile.role === 'super_admin'}
      />
    </div>
  )
}

export const dynamic = 'force-dynamic'
