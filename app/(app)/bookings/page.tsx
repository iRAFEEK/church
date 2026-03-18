import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { BookingsPageClient } from '@/components/locations/BookingsPageClient'

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
    <BookingsPageClient
      locations={locations ?? []}
      currentUserId={user.profile.id}
      isSuperAdmin={user.profile.role === 'super_admin'}
    />
  )
}

export const dynamic = 'force-dynamic'
