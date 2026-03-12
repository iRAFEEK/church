'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { NEED_CATEGORIES, NEED_URGENCIES } from '@/lib/community/constants'

interface NeedFiltersProps {
  countries: string[]
}

export function NeedFilters({ countries }: NeedFiltersProps) {
  const t = useTranslations('churchNeeds')
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm'

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current)
            const value = e.target.value
            searchTimeout.current = setTimeout(() => setFilter('search', value), 300)
          }}
          className="ps-9 h-9"
        />
      </div>

      <select
        className={selectClass}
        value={searchParams.get('category') || ''}
        onChange={(e) => setFilter('category', e.target.value)}
      >
        <option value="">{t('allCategories')}</option>
        {NEED_CATEGORIES.map((c) => (
          <option key={c} value={c}>{t(`categories.${c}`)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get('urgency') || ''}
        onChange={(e) => setFilter('urgency', e.target.value)}
      >
        <option value="">{t('allUrgencies')}</option>
        {NEED_URGENCIES.map((u) => (
          <option key={u} value={u}>{t(`urgencies.${u}`)}</option>
        ))}
      </select>

      {countries.length > 1 && (
        <select
          className={selectClass}
          value={searchParams.get('country') || ''}
          onChange={(e) => setFilter('country', e.target.value)}
        >
          <option value="">{t('allCountries')}</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  )
}
