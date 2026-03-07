'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Clock, ListOrdered, User, Users, StickyNote, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Segment {
  id: string
  title: string
  title_ar: string | null
  duration_minutes: number | null
  ministry: { id: string; name: string; name_ar: string | null } | null
  profile: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null
  notes: string | null
  notes_ar: string | null
  sort_order: number
}

interface EventRunOfShowProps {
  eventId: string
}

export function EventRunOfShow({ eventId }: EventRunOfShowProps) {
  const t = useTranslations('templates')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/events/${eventId}/segments`)
      .then(r => r.json())
      .then(d => setSegments(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) return <div className="text-sm text-zinc-400 py-4">{t('loading')}</div>
  if (segments.length === 0) return null

  const totalDuration = segments.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  return (
    <div className="space-y-3">
      {totalDuration > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          {t('totalDuration')}: {totalDuration} {t('min')}
        </div>
      )}

      <div className="divide-y rounded-xl border overflow-hidden">
        {segments.map((seg, i) => {
          const segTitle = isRTL ? (seg.title_ar || seg.title) : seg.title
          const ministryName = seg.ministry
            ? (isRTL ? (seg.ministry.name_ar || seg.ministry.name) : seg.ministry.name)
            : null
          const personName = seg.profile
            ? (isRTL
              ? `${seg.profile.first_name_ar || seg.profile.first_name || ''} ${seg.profile.last_name_ar || seg.profile.last_name || ''}`.trim()
              : `${seg.profile.first_name || ''} ${seg.profile.last_name || ''}`.trim()
            )
            : null
          const hasNotes = seg.notes || seg.notes_ar
          const noteText = isRTL ? (seg.notes_ar || seg.notes) : (seg.notes || seg.notes_ar)
          const isExpanded = expandedNotes === seg.id

          return (
            <div key={seg.id} className="bg-white">
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  hasNotes && 'cursor-pointer hover:bg-zinc-50'
                )}
                onClick={() => hasNotes && setExpandedNotes(isExpanded ? null : seg.id)}
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{segTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {seg.duration_minutes && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {seg.duration_minutes} {t('min')}
                      </Badge>
                    )}
                    {ministryName && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {ministryName}
                      </Badge>
                    )}
                    {personName && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {personName}
                      </span>
                    )}
                  </div>
                </div>
                {hasNotes && (
                  <div className="text-zinc-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                )}
              </div>
              {isExpanded && noteText && (
                <div className="px-4 pb-3 ps-15">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                    <StickyNote className="h-3.5 w-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">{noteText}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
