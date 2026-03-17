import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { MyBookingsList } from '@/components/locations/MyBookingsList'

export default async function MyBookingsPage() {
  const user = await getCurrentUserWithRole()
  const t = await getTranslations('bookings')

  if (!user.resolvedPermissions.can_book_locations) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select(
      'id, location_id, booked_by, title, title_ar, starts_at, ends_at, status, notes, is_public, created_at, location:locations!location_id(id, name, name_ar)'
    )
    .eq('church_id', user.profile.church_id)
    .eq('booked_by', user.profile.id)
    .eq('status', 'confirmed')
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(25)

  // Normalize Supabase FK join (returns array without Database generic)
  const upcomingBookings = (rawBookings ?? []).map((b) => ({
    ...b,
    location: Array.isArray(b.location) ? b.location[0] ?? null : b.location,
  }))

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <h1 className="text-2xl font-bold text-zinc-900">{t('myBookingsTitle')}</h1>

      <MyBookingsList
        initialBookings={upcomingBookings}
        currentUserId={user.profile.id}
      />
    </div>
  )
}

export const dynamic = 'force-dynamic'
