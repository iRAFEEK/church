'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
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

interface EventsSearchFilterProps {
  ministries: Ministry[]
  groups: Group[]
  onFilterChange: (filters: { search: string; ministryId: string; groupId: string }) => void
}

export function EventsSearchFilter({ ministries, groups, onFilterChange }: EventsSearchFilterProps) {
  const t = useTranslations('events')
  const [search, setSearch] = useState('')
  const [ministryId, setMinistryId] = useState('')
  const [groupId, setGroupId] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    onFilterChange({ search: debouncedSearch, ministryId, groupId })
  }, [debouncedSearch, ministryId, groupId, onFilterChange])

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ps-9 pe-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <select
        value={ministryId}
        onChange={e => setMinistryId(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">{t('allMinistries')}</option>
        {ministries.map(m => (
          <option key={m.id} value={m.id}>{m.name_ar || m.name}</option>
        ))}
      </select>

      <select
        value={groupId}
        onChange={e => setGroupId(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">{t('allGroups')}</option>
        {groups.map(g => (
          <option key={g.id} value={g.id}>{g.name_ar || g.name}</option>
        ))}
      </select>
    </div>
  )
}
