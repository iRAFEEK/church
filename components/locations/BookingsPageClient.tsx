'use client'

import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { MobileBookingView } from './MobileBookingView'
import { DesktopBookingView } from './DesktopBookingView'

type BookingsPageClientProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  currentUserId: string
  isSuperAdmin: boolean
}

export function BookingsPageClient({
  locations,
  currentUserId,
  isSuperAdmin,
}: BookingsPageClientProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Render entirely different component trees per viewport
  // This avoids fetching data for both views simultaneously
  if (isDesktop) {
    return (
      <DesktopBookingView
        locations={locations}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
      />
    )
  }

  return (
    <MobileBookingView
      locations={locations}
      currentUserId={currentUserId}
      isSuperAdmin={isSuperAdmin}
    />
  )
}
