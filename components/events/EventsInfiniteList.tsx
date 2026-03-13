'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { EventCard } from './EventCard'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Event = {
  id: string
  title: string
  title_ar: string
  description: string | null
  description_ar: string | null
  event_type: string
  starts_at: string
  ends_at: string | null
  location: string | null
  capacity: number | null
  is_public: boolean
  status: string
}

interface Props {
  initialEvents: Event[]
  initialCursor: string | null
  isAdmin: boolean
  upcoming?: boolean
  search?: string
  ministryId?: string
  groupId?: string
}

export function EventsInfiniteList({ initialEvents, initialCursor, isAdmin, upcoming, search, ministryId, groupId }: Props) {
  const t = useTranslations('events')
  const [events, setEvents] = useState(initialEvents)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // When filters change, re-fetch from scratch
  const hasFilters = !!(search || ministryId || groupId)

  useEffect(() => {
    if (!hasFilters) {
      // Reset to server-rendered initial data
      setEvents(initialEvents)
      setCursor(initialCursor)
      return
    }

    const controller = new AbortController()
    setFiltering(true)

    const params = new URLSearchParams({ pageSize: '20' })
    if (upcoming) params.set('upcoming', 'true')
    if (!isAdmin) params.set('status', 'published')
    if (search) params.set('search', search)
    if (ministryId) params.set('ministry_id', ministryId)
    if (groupId) params.set('group_id', groupId)

    fetch(`/api/events?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (controller.signal.aborted) return
        setEvents(json.data || [])
        setCursor(json.nextCursor || null)
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[EventsInfiniteList] Failed to fetch:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setFiltering(false) })

    return () => controller.abort()
  }, [search, ministryId, groupId, hasFilters, isAdmin, upcoming, initialEvents, initialCursor])

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ cursor, pageSize: '20' })
      if (upcoming) params.set('upcoming', 'true')
      if (!isAdmin) params.set('status', 'published')
      if (search) params.set('search', search)
      if (ministryId) params.set('ministry_id', ministryId)
      if (groupId) params.set('group_id', groupId)
      const res = await fetch(`/api/events?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setEvents(prev => [...prev, ...(json.data || [])])
      setCursor(json.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, isAdmin, upcoming, search, ministryId, groupId])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  if (filtering) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {hasFilters ? t('noSearchResults') : (isAdmin ? t('noEvents') : t('noUpcomingEvents'))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            href={isAdmin ? `/admin/events/${event.id}` : `/events/${event.id}`}
          />
        ))}
      </div>
      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
      )}
    </>
  )
}
