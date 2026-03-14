'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { SearchInput } from '@/components/ui/search-input'
import { useDebounce } from '@/lib/utils/search'

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

interface EventResult {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
}

interface EventsSearchFilterProps {
  ministries: Ministry[]
  groups: Group[]
  isAdmin: boolean
  onFilterChange: (filters: { search: string; ministryId: string; groupId: string }) => void
}

export function EventsSearchFilter({ ministries, groups, isAdmin, onFilterChange }: EventsSearchFilterProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [ministryId, setMinistryId] = useState('')
  const [groupId, setGroupId] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    onFilterChange({ search: debouncedSearch, ministryId, groupId })
  }, [debouncedSearch, ministryId, groupId, onFilterChange])

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <SearchInput<EventResult>
        value={search}
        onChange={setSearch}
        placeholder={t('searchPlaceholder')}
        noResultsText={t('noSearchResults')}
        className="flex-1"
        fetchResults={async (q) => {
          const res = await fetch(`/api/events?search=${encodeURIComponent(q)}&pageSize=6`)
          if (!res.ok) return []
          const json = await res.json()
          return json.data || []
        }}
        getKey={(e) => e.id}
        renderResult={(e) => {
          const title = isAr ? (e.title_ar || e.title) : e.title
          const date = new Date(e.starts_at).toLocaleDateString(locale)
          return (
            <div>
              <p className="font-medium truncate">{title}</p>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
          )
        }}
        onSelect={(e) => router.push(isAdmin ? `/admin/events/${e.id}` : `/events/${e.id}`)}
      />

      <select
        value={ministryId}
        onChange={e => setMinistryId(e.target.value)}
        className="w-full sm:w-auto h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">{t('allMinistries')}</option>
        {ministries.map(m => (
          <option key={m.id} value={m.id}>{m.name_ar || m.name}</option>
        ))}
      </select>

      <select
        value={groupId}
        onChange={e => setGroupId(e.target.value)}
        className="w-full sm:w-auto h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">{t('allGroups')}</option>
        {groups.map(g => (
          <option key={g.id} value={g.id}>{g.name_ar || g.name}</option>
        ))}
      </select>
    </div>
  )
}
