'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Building2, Check, Clock, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import type { ChurchSearchResult } from '@/types'

export function JoinAnotherChurch() {
  const t = useTranslations('joinAnother')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChurchSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const controller = new AbortController()

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/churches/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (res.ok && !controller.signal.aborted) setResults(await res.json())
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          logger.error('Church search failed', { module: 'churches', error: e })
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      controller.abort()
    }
  }, [query])

  async function requestJoin(church: ChurchSearchResult) {
    setRequestingId(church.id)
    try {
      const res = await fetch('/api/churches/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: church.id }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok || res.status === 409) {
        // 409 = already a member or already has a pending request — both mean "done".
        setRequestedIds((prev) => new Set(prev).add(church.id))
        toast.success(res.ok ? t('requestSent', { church: church.name }) : (data.error ?? t('alreadyRequested')))
        return
      }
      toast.error(data.error ?? t('errorToast'))
    } finally {
      setRequestingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="ps-9 text-base"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          dir="auto"
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((church) => {
            const requested = requestedIds.has(church.id)
            return (
              <li key={church.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  {church.logo_url ? (
                    <Image src={church.logo_url} alt={church.name} width={32} height={32} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{church.name}</p>
                  {church.name_ar && (
                    <p className="text-sm text-muted-foreground truncate" dir="rtl">{church.name_ar}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{church.country}</p>
                </div>

                <Button
                  size="sm"
                  variant={requested ? 'secondary' : 'default'}
                  disabled={requestingId !== null || requested}
                  onClick={() => requestJoin(church)}
                  className="shrink-0 h-9"
                >
                  {requestingId === church.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : requested ? (
                    <><Clock className="h-4 w-4 me-1" />{t('requested')}</>
                  ) : (
                    <><Check className="h-4 w-4 me-1" />{t('request')}</>
                  )}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {results.length === 0 && query.length > 0 && !searching && (
        <p className="text-sm text-center text-muted-foreground py-6">{t('noResults', { query })}</p>
      )}

      {results.length === 0 && query.length === 0 && !searching && (
        <p className="text-sm text-center text-muted-foreground py-6">{t('hint')}</p>
      )}
    </div>
  )
}
