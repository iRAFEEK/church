'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { SearchInput } from '@/components/ui/search-input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  email: string | null
  role: string
  photo_url: string | null
}

interface MembersSearchInputProps {
  defaultValue?: string
}

export function MembersSearchInput({ defaultValue }: MembersSearchInputProps) {
  const t = useTranslations('members')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const router = useRouter()
  const [value, setValue] = useState(defaultValue ?? '')

  return (
    <SearchInput<Profile>
      value={value}
      onChange={setValue}
      placeholder={t('searchPlaceholder')}
      noResultsText={t('emptyNoResults')}
      className="flex-1 min-w-48"
      fetchResults={async (q) => {
        const res = await fetch(`/api/profiles?q=${encodeURIComponent(q)}&pageSize=6`)
        if (!res.ok) return []
        const json = await res.json()
        return json.data || []
      }}
      getKey={(m) => m.id}
      renderResult={(m) => {
        const nameAr = `${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.trim()
        const nameEn = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()
        const displayName = isAr ? (nameAr || nameEn) : (nameEn || nameAr) || m.email || '—'
        const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={m.photo_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{displayName}</p>
              {m.email && <p className="text-xs text-muted-foreground truncate" dir="ltr">{m.email}</p>}
            </div>
          </div>
        )
      }}
      onSelect={(m) => router.push(`/admin/members/${m.id}`)}
    />
  )
}
