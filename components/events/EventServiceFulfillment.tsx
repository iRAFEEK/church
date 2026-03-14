'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Users, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/utils/storage'
import type { EventServiceNeedWithDetails } from '@/types'

interface EventServiceFulfillmentProps {
  eventId: string
}

export function EventServiceFulfillment({ eventId }: EventServiceFulfillmentProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [needs, setNeeds] = useState<EventServiceNeedWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNeed, setExpandedNeed] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/events/${eventId}/service-needs`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setNeeds(d.data || []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[EventServiceFulfillment] Failed to fetch:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [eventId])

  if (loading) return <div className="text-sm text-zinc-400 py-4">{t('loading')}</div>
  if (needs.length === 0) return null

  return (
    <div className="space-y-3">
      {needs.map(need => {
        const name = isRTL
          ? (need.ministry?.name_ar || need.ministry?.name || need.group?.name_ar || need.group?.name)
          : (need.ministry?.name || need.group?.name)
        const assignedCount = need.assigned_count
        const needed = need.volunteers_needed
        const confirmedCount = (need.assignments || []).filter(a => a.status === 'confirmed').length
        const declinedCount = (need.assignments || []).filter(a => a.status === 'declined').length
        const pendingCount = (need.assignments || []).filter(a => a.status === 'assigned').length
        const ratio = Math.min(assignedCount / needed, 1)
        const isExpanded = expandedNeed === need.id

        let statusColor = 'bg-red-100 text-red-700'
        let statusText = t('needsStaffing')
        if (assignedCount >= needed) {
          statusColor = 'bg-green-100 text-green-700'
          statusText = t('fullyStaffed')
        } else if (assignedCount > 0) {
          statusColor = 'bg-yellow-100 text-yellow-700'
          statusText = t('partiallyStaffed')
        }

        return (
          <div key={need.id} className="border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedNeed(isExpanded ? null : need.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors text-start"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                  <Badge variant="outline" className={cn('text-xs', statusColor)}>
                    {statusText}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t('fulfillment', { assigned: String(assignedCount), needed: String(needed) })}
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      ratio >= 1 ? 'bg-green-500' : ratio > 0 ? 'bg-yellow-500' : 'bg-zinc-200'
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-zinc-400">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                {/* Status breakdown */}
                <div className="flex gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    {confirmedCount} {t('confirmedStatus')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-yellow-500" />
                    {pendingCount} {t('assignedStatus')}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    {declinedCount} {t('declinedStatus')}
                  </span>
                </div>

                {/* Notes */}
                {(need.notes || need.notes_ar) && (
                  <p className="text-xs text-zinc-400 italic">
                    {isRTL ? (need.notes_ar || need.notes) : (need.notes || need.notes_ar)}
                  </p>
                )}

                {/* Assignment list */}
                {need.assignments && need.assignments.length > 0 && (
                  <div className="space-y-1.5">
                    {need.assignments.map(assignment => {
                      const pName = isRTL
                        ? `${assignment.profile.first_name_ar || assignment.profile.first_name || ''} ${assignment.profile.last_name_ar || assignment.profile.last_name || ''}`
                        : `${assignment.profile.first_name || ''} ${assignment.profile.last_name || ''}`

                      const statusBadge: Record<string, string> = {
                        assigned: 'bg-yellow-100 text-yellow-700',
                        confirmed: 'bg-green-100 text-green-700',
                        declined: 'bg-red-100 text-red-700',
                      }

                      return (
                        <div key={assignment.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-zinc-50">
                          {assignment.profile.photo_url ? (
                            <Image src={getAvatarUrl(assignment.profile.photo_url, 28)!} alt={pName.trim()} width={28} height={28} sizes="28px" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-500">
                              {(assignment.profile.first_name || '?')[0]}
                            </div>
                          )}
                          <span className="text-sm text-zinc-700 flex-1 truncate">
                            {pName.trim()}
                            {assignment.role && (
                              <span className="text-zinc-400 ms-1.5">
                                ({isRTL ? (assignment.role_ar || assignment.role) : assignment.role})
                              </span>
                            )}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px]', statusBadge[assignment.status])}>
                            {t(`${assignment.status}Status`)}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
