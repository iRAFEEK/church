'use client'

import { useState, useCallback } from 'react'
import { EventsSearchFilter } from './EventsSearchFilter'
import { EventsInfiniteList } from './EventsInfiniteList'

interface Ministry {
  id: string
  name: string
  name_ar: string | null
}

interface Group {
  id: string
  name: string
  name_ar: string | null
}

interface EventsPageClientProps {
  initialEvents: Parameters<typeof EventsInfiniteList>[0]['initialEvents']
  initialCursor: string | null
  isAdmin: boolean
  upcoming: boolean
  ministries: Ministry[]
  groups: Group[]
}

export function EventsPageClient({
  initialEvents,
  initialCursor,
  isAdmin,
  upcoming,
  ministries,
  groups,
}: EventsPageClientProps) {
  const [filters, setFilters] = useState({ search: '', ministryId: '', groupId: '' })

  const handleFilterChange = useCallback((f: { search: string; ministryId: string; groupId: string }) => {
    setFilters(f)
  }, [])

  return (
    <div className="space-y-4">
      <EventsSearchFilter
        ministries={ministries}
        groups={groups}
        isAdmin={isAdmin}
        onFilterChange={handleFilterChange}
      />
      <EventsInfiniteList
        initialEvents={initialEvents}
        initialCursor={initialCursor}
        isAdmin={isAdmin}
        upcoming={upcoming}
        search={filters.search}
        ministryId={filters.ministryId}
        groupId={filters.groupId}
      />
    </div>
  )
}
