'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

type Leader = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

type Group = {
  id: string
  name: string
  name_ar: string | null
  type: string
  is_active: boolean
  is_open: boolean
  meeting_day: string | null
  meeting_frequency: string | null
  max_members: number | null
  ministry?: { id: string; name: string; name_ar: string | null } | null
  leader?: Leader | null
  group_members?: [{ count: number }]
}

type Ministry = { id: string; name: string; name_ar: string | null }

const GROUP_TYPE_KEYS: Record<string, string> = {
  small_group: 'typeSmallGroup',
  youth: 'typeYouth',
  women: 'typeWomen',
  men: 'typeMen',
  family: 'typeFamily',
  prayer: 'typePrayer',
  other: 'typeOther',
}

const DAY_KEYS: Record<string, string> = {
  monday: 'dayMonday',
  tuesday: 'dayTuesday',
  wednesday: 'dayWednesday',
  thursday: 'dayThursday',
  friday: 'dayFriday',
  saturday: 'daySaturday',
  sunday: 'daySunday',
}

export function GroupsTable({
  groups,
  ministries,
  isAdmin,
}: {
  groups: Group[]
  ministries: Ministry[]
  isAdmin: boolean
}) {
  const t = useTranslations('groups')
  const [filter, setFilter] = useState<string>('all')
  const [ministryFilter, setMinistryFilter] = useState<string>('all')

  const filtered = groups.filter(g => {
    if (filter !== 'all' && g.type !== filter) return false
    if (ministryFilter !== 'all' && g.ministry?.id !== ministryFilter) return false
    return true
  })

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-400">
        <p className="font-medium">{t('tableEmptyTitle')}</p>
        <p className="text-sm mt-1">{t('tableEmptySubtitle')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 flex-wrap">
        <select
          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">{t('filterAllTypes')}</option>
          {Object.entries(GROUP_TYPE_KEYS).map(([v, key]) => (
            <option key={v} value={v}>{t(key)}</option>
          ))}
        </select>

        {ministries.length > 0 && (
          <select
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white"
            value={ministryFilter}
            onChange={e => setMinistryFilter(e.target.value)}
          >
            <option value="all">{t('filterAllMinistries')}</option>
            {ministries.map(m => (
              <option key={m.id} value={m.id}>{m.name_ar || m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(g => {
          const memberCount = g.group_members?.[0]?.count || 0
          const leaderName = g.leader
            ? `${g.leader.first_name_ar || g.leader.first_name} ${g.leader.last_name_ar || g.leader.last_name}`
            : t('leaderUnset')

          return (
            <Link
              key={g.id}
              href={isAdmin ? `/admin/groups/${g.id}` : `/groups/${g.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-zinc-900">{g.name_ar || g.name}</p>
                  {g.name_ar && <p className="text-xs text-zinc-400">{g.name}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                    {GROUP_TYPE_KEYS[g.type] ? t(GROUP_TYPE_KEYS[g.type]) : g.type}
                  </span>
                  {!g.is_active && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{t('detailInactive')}</span>
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-500 space-y-1 mt-3">
                <p>{leaderName}</p>
                <p>{memberCount} {t('leaderStatsMembers')}{g.max_members ? ` / ${g.max_members}` : ''}</p>
                {g.meeting_day && (
                  <p>{DAY_KEYS[g.meeting_day] ? t(DAY_KEYS[g.meeting_day]) : g.meeting_day}</p>
                )}
                {g.ministry && (
                  <p>{g.ministry.name_ar || g.ministry.name}</p>
                )}
              </div>

              {!g.is_open && (
                <p className="text-xs text-orange-500 mt-2">{t('groupClosed')}</p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
