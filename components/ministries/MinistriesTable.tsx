'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { SearchInput } from '@/components/ui/search-input'
import { normalizeSearch } from '@/lib/utils/search'
import { Users } from 'lucide-react'

type Leader = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

type Ministry = {
  id: string
  name: string
  name_ar: string | null
  is_active: boolean
  photo_url?: string | null
  leader?: Leader | null
  ministry_members?: [{ count: number }]
}

export function MinistriesTable({ ministries }: { ministries: Ministry[] }) {
  const t = useTranslations('ministries')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? ministries.filter(m => {
        const q = normalizeSearch(search)
        return (
          normalizeSearch(m.name).includes(q) ||
          normalizeSearch(m.name_ar || '').includes(q)
        )
      })
    : ministries

  return (
    <div className="space-y-4">
      <SearchInput<Ministry>
        value={search}
        onChange={setSearch}
        placeholder={t('searchPlaceholder')}
        noResultsText={t('emptyTitle')}
        fetchResults={async (q) => {
          const normalized = normalizeSearch(q)
          return ministries
            .filter(m =>
              normalizeSearch(m.name).includes(normalized) ||
              normalizeSearch(m.name_ar || '').includes(normalized)
            )
            .slice(0, 8)
        }}
        getKey={(m) => m.id}
        renderResult={(m) => {
          const memberCount = m.ministry_members?.[0]?.count ?? 0
          return (
            <div>
              <p className="font-medium">{isAr ? (m.name_ar || m.name) : m.name}</p>
              <p className="text-xs text-muted-foreground">{memberCount} {t('detailMembers')}</p>
            </div>
          )
        }}
        onSelect={(m) => router.push(`/admin/ministries/${m.id}`)}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('emptyTitle')}</h3>
          <p className="text-sm text-zinc-500 max-w-[260px]">{t('emptySubtitle')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {filtered.map((m) => {
            const leader = m.leader
            const memberCount = m.ministry_members?.[0]?.count ?? 0
            return (
              <Link key={m.id} href={`/admin/ministries/${m.id}`} className="block">
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors">
                  {m.photo_url ? (
                    <Image
                      src={m.photo_url}
                      alt={m.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-lg shrink-0">
                      {(m.name_ar || m.name)[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{m.name_ar || m.name}</span>
                      {!m.is_active && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{t('inactive')}</span>
                      )}
                    </div>
                    {m.name_ar && <p className="text-xs text-zinc-400">{m.name}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {leader && (
                        <p className="text-xs text-zinc-500">
                          {t('leaderLabel')} {leader.first_name_ar || leader.first_name} {leader.last_name_ar || leader.last_name}
                        </p>
                      )}
                      <span className="text-xs text-zinc-400">
                        {memberCount} {t('detailMembers')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
