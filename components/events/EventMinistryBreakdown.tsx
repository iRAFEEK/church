'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/utils/storage'
import Link from 'next/link'
import Image from 'next/image'

interface MinistryGroup {
  type: 'ministry' | 'group'
  ministry: { id: string; name: string; name_ar: string | null; leader_id: string | null } | null
  group: { id: string; name: string; name_ar: string | null; leader_id: string | null; co_leader_id?: string | null } | null
  needs: { id: string; volunteers_needed: number; notes: string | null; notes_ar: string | null }[]
  assignments: {
    id: string
    profile_id: string
    status: 'assigned' | 'confirmed' | 'declined'
    role: string | null
    role_ar: string | null
    notes: string | null
    profile: {
      id: string
      first_name: string | null
      last_name: string | null
      first_name_ar: string | null
      last_name_ar: string | null
      photo_url: string | null
      phone: string | null
    }
  }[]
  stats: {
    total_needed: number
    assigned: number
    confirmed: number
    declined: number
    pending: number
  }
}

interface EventMinistryBreakdownProps {
  eventId: string
}

export function EventMinistryBreakdown({ eventId }: EventMinistryBreakdownProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [groups, setGroups] = useState<MinistryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/ministry-summary`)
      const data = await res.json()
      setGroups(data.data || [])
      // Auto-expand all
      const keys = new Set<string>((data.data || []).map((_: any, i: number) => String(i)))
      setExpandedKeys(keys)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const getDisplayName = useCallback((p: { first_name?: string | null; last_name?: string | null; first_name_ar?: string | null; last_name_ar?: string | null }) => {
    if (isRTL) {
      return `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
    }
    return `${p.first_name || ''} ${p.last_name || ''}`.trim()
  }, [isRTL])

  const getRoleName = useCallback((a: { role?: string | null; role_ar?: string | null }) => {
    if (isRTL) return a.role_ar || a.role || null
    return a.role || null
  }, [isRTL])

  const statusConfig = useMemo(() => ({
    assigned: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3.5 w-3.5" /> },
    confirmed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    declined: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
  } as Record<string, { color: string; icon: React.ReactNode }>), [])

  if (loading) {
    return <div className="text-center py-8 text-zinc-400 text-sm">{t('loading')}</div>
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
        {t('noServiceNeeds')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group, index) => {
        const key = String(index)
        const isExpanded = expandedKeys.has(key)
        const teamName = isRTL
          ? (group.ministry?.name_ar || group.ministry?.name || group.group?.name_ar || group.group?.name || '')
          : (group.ministry?.name || group.group?.name || '')

        const ratio = group.stats.total_needed > 0
          ? Math.min(group.stats.assigned / group.stats.total_needed, 1)
          : 0

        return (
          <div key={key} className="border rounded-xl overflow-hidden">
            {/* Header — clickable to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleExpand(key)}
              className="w-full flex items-center gap-3 p-4 text-start hover:bg-zinc-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-800">{teamName}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                  <span>{t('totalNeeded')}: {group.stats.total_needed}</span>
                  <span>{t('totalAssigned')}: {group.stats.assigned}</span>
                  {group.stats.confirmed > 0 && (
                    <span className="text-green-600">{t('totalConfirmed')}: {group.stats.confirmed}</span>
                  )}
                  {group.stats.declined > 0 && (
                    <span className="text-red-600">{t('totalDeclined')}: {group.stats.declined}</span>
                  )}
                </div>
              </div>
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      ratio >= 1 ? 'bg-green-500' : ratio > 0 ? 'bg-yellow-500' : 'bg-zinc-200'
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t px-4 pb-4">
                {group.assignments.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-sm">
                    {t('noAssignmentsYet')}
                  </div>
                ) : (
                  <div className="divide-y">
                    {group.assignments.map(assignment => {
                      const pName = getDisplayName(assignment.profile)
                      const roleName = getRoleName(assignment)
                      const config = statusConfig[assignment.status]

                      return (
                        <div key={assignment.id} className="flex items-center gap-3 py-3">
                          {assignment.profile.photo_url ? (
                            <Image src={getAvatarUrl(assignment.profile.photo_url, 32)!} alt={pName} width={32} height={32} sizes="32px" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-500">
                              {(assignment.profile.first_name || '?')[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-700 truncate">{pName}</p>
                            {roleName && (
                              <p className="text-xs text-zinc-500">{roleName}</p>
                            )}
                          </div>
                          <Badge variant="outline" className={cn('text-xs flex items-center gap-1', config.color)}>
                            {config.icon}
                            {t(`${assignment.status}Status`)}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Link to staffing page for this event */}
                <div className="mt-3 pt-3 border-t">
                  <Link href={`/admin/events/${eventId}/staffing`}>
                    <Button variant="outline" size="sm" className="w-full">
                      {t('manageStaffing')}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
