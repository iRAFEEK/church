'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Search, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type LocationRow = {
  id: string
  name: string
  name_ar: string | null
  location_type: string
  capacity: number | null
  features: string[]
  is_active: boolean
  notes: string | null
  notes_ar: string | null
  created_at: string
}

type LocationsTableProps = {
  locations: LocationRow[]
}

const TYPE_COLORS: Record<string, string> = {
  sanctuary: 'bg-purple-100 text-purple-700',
  hall: 'bg-blue-100 text-blue-700',
  classroom: 'bg-amber-100 text-amber-700',
  prayer_room: 'bg-emerald-100 text-emerald-700',
  office: 'bg-zinc-100 text-zinc-700',
  nursery: 'bg-pink-100 text-pink-700',
  other: 'bg-zinc-100 text-zinc-700',
}

const TYPE_KEYS: Record<string, string> = {
  sanctuary: 'typeSanctuary',
  hall: 'typeHall',
  classroom: 'typeClassroom',
  prayer_room: 'typePrayerRoom',
  office: 'typeOffice',
  nursery: 'typeNursery',
  other: 'typeOther',
}

export function LocationsTable({ locations }: LocationsTableProps) {
  const t = useTranslations('locations')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return locations
    const q = search.toLowerCase()
    return locations.filter(loc => {
      const name = `${loc.name} ${loc.name_ar || ''}`.toLowerCase()
      return name.includes(q)
    })
  }, [locations, search])

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('emptyTitle')}</h3>
        <p className="text-sm text-zinc-500 max-w-[280px] mb-6">{t('emptyBody')}</p>
        <Button asChild className="h-11">
          <Link href="/admin/locations/new">
            <Plus className="h-4 w-4 me-2" />
            {t('emptyAction')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          dir="auto"
          className="text-base ps-10 h-11"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-zinc-50 text-xs text-zinc-500">
                <th className="text-start px-4 py-3 font-medium">{t('name')}</th>
                <th className="text-start px-4 py-3 font-medium">{t('type')}</th>
                <th className="text-start px-4 py-3 font-medium">{t('capacity')}</th>
                <th className="text-start px-4 py-3 font-medium">{t('status')}</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(loc => (
                <tr key={loc.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/locations/${loc.id}`} className="block">
                      <p className="font-medium text-zinc-900">{loc.name_ar || loc.name}</p>
                      {loc.name_ar && <p className="text-xs text-zinc-400">{loc.name}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', TYPE_COLORS[loc.location_type] || TYPE_COLORS.other)}>
                      {t(TYPE_KEYS[loc.location_type] || 'typeOther')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600" dir="ltr">
                    {loc.capacity ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={loc.is_active ? 'default' : 'secondary'} className="text-xs">
                      {loc.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/locations/${loc.id}`} aria-label={t('editLocation')}>
                      <ChevronRight className="h-4 w-4 text-zinc-400 rtl:rotate-180" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(loc => (
          <Link
            key={loc.id}
            href={`/admin/locations/${loc.id}`}
            className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900">{loc.name_ar || loc.name}</p>
                {loc.name_ar && <p className="text-xs text-zinc-400">{loc.name}</p>}
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0 ms-2', TYPE_COLORS[loc.location_type] || TYPE_COLORS.other)}>
                {t(TYPE_KEYS[loc.location_type] || 'typeOther')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mt-2">
              <div className="flex items-center gap-3">
                {loc.capacity && (
                  <span dir="ltr">{t('capacity')}: {loc.capacity}</span>
                )}
                <Badge variant={loc.is_active ? 'default' : 'secondary'} className="text-xs">
                  {loc.is_active ? t('active') : t('inactive')}
                </Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 rtl:rotate-180" />
            </div>
          </Link>
        ))}
      </div>

      {/* No search results */}
      {filtered.length === 0 && search && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          {t('noSearchResults')}
        </div>
      )}
    </div>
  )
}
