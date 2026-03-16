'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { useTranslations } from 'next-intl'
import { normalizeSearch, useDebounce } from '@/lib/utils/search'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'

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
  ministry?: { id: string; name: string; name_ar: string | null; is_default?: boolean } | null
  leader?: Leader | null
  group_members?: [{ count: number }]
}

type Ministry = { id: string; name: string; name_ar: string | null; is_default?: boolean }

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
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [ministryFilter, setMinistryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const filtered = useMemo(() => {
    const q = normalizeSearch(debouncedSearch)
    return groups.filter(g => {
      if (filter !== 'all' && g.type !== filter) return false
      if (ministryFilter !== 'all' && g.ministry?.id !== ministryFilter) return false
      if (q) {
        const groupName = normalizeSearch(`${g.name} ${g.name_ar || ''}`)
        const leaderName = g.leader
          ? normalizeSearch(`${g.leader.first_name || ''} ${g.leader.last_name || ''} ${g.leader.first_name_ar || ''} ${g.leader.last_name_ar || ''}`)
          : ''
        const ministryName = g.ministry
          ? normalizeSearch(`${g.ministry.name} ${g.ministry.name_ar || ''}`)
          : ''
        if (!groupName.includes(q) && !leaderName.includes(q) && !ministryName.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [groups, filter, ministryFilter, debouncedSearch])

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('tableEmptyTitle')}</h3>
        <p className="text-sm text-zinc-500 max-w-[260px]">{t('tableEmptySubtitle')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search + Filters */}
      <div className="space-y-3 mb-4">
        <SearchInput<Group>
          value={search}
          onChange={setSearch}
          placeholder={t('searchPlaceholder')}
          noResultsText={t('noSearchResults')}
          fetchResults={async (q) => {
            const normalized = normalizeSearch(q)
            return groups.filter(g => {
              const name = normalizeSearch(`${g.name} ${g.name_ar || ''}`)
              const leader = g.leader
                ? normalizeSearch(`${g.leader.first_name || ''} ${g.leader.last_name || ''} ${g.leader.first_name_ar || ''} ${g.leader.last_name_ar || ''}`)
                : ''
              const ministry = g.ministry ? normalizeSearch(`${g.ministry.name} ${g.ministry.name_ar || ''}`) : ''
              return name.includes(normalized) || leader.includes(normalized) || ministry.includes(normalized)
            }).slice(0, 8)
          }}
          getKey={(g) => g.id}
          renderResult={(g) => (
            <div>
              <p className="font-medium">{g.name_ar || g.name}</p>
              {g.ministry && !g.ministry.is_default && <p className="text-xs text-muted-foreground">{g.ministry.name_ar || g.ministry.name}</p>}
            </div>
          )}
          onSelect={(g) => router.push(isAdmin ? `/admin/groups/${g.id}` : `/groups/${g.id}`)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
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

          {ministries.filter(m => !m.is_default).length > 0 && (
            <select
              className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 bg-white"
              value={ministryFilter}
              onChange={e => setMinistryFilter(e.target.value)}
            >
              <option value="all">{t('filterAllMinistries')}</option>
              {ministries.filter(m => !m.is_default).map(m => (
                <option key={m.id} value={m.id}>{m.name_ar || m.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results count */}
      {search && (
        <p className="text-xs text-zinc-400 mb-3">
          {filtered.length} {t('searchResults')}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          {t('noSearchResults')}
        </div>
      ) : (
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
                  {g.ministry && !g.ministry.is_default && (
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
      )}
    </div>
  )
}
