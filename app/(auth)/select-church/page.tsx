'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Building2, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { UserChurchWithDetails } from '@/types'

export default function SelectChurchPage() {
  const t = useTranslations('SelectChurch')
  const router = useRouter()
  const [churches, setChurches] = useState<UserChurchWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/churches/my-churches', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { if (!controller.signal.aborted) setChurches(Array.isArray(data) ? data : []) })
      .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') console.error('[SelectChurch] Failed to fetch:', e) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  async function handleSelect(churchId: string) {
    setSwitchingId(churchId)
    try {
      const res = await fetch('/api/churches/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: churchId }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(t('error.switch'), { description: data.error })
        return
      }

      router.push('/')
      router.refresh()
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : churches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{t('emptyState.title')}</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {t('emptyState.body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button asChild className="h-11 w-full sm:w-auto">
                <Link href="/onboarding">
                  <Search className="size-4 me-2" />
                  {t('emptyState.joinChurch')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
                <Link href="/welcome">
                  <Plus className="size-4 me-2" />
                  {t('emptyState.createChurch')}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {churches.map((membership) => {
              const church = membership.church as { id: string; name: string; name_ar: string | null; logo_url: string | null; country: string }
              return (
                <li key={membership.church_id}>
                  <Button
                    variant="outline"
                    className="w-full h-auto px-4 py-3 justify-start gap-3"
                    disabled={switchingId !== null}
                    onClick={() => handleSelect(membership.church_id)}
                  >
                    {/* Logo / fallback */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      {church.logo_url ? (
                        <Image
                          src={church.logo_url}
                          alt={church.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 text-start min-w-0">
                      <p className="font-medium truncate">{church.name}</p>
                      {church.name_ar && (
                        <p className="text-sm text-muted-foreground truncate" dir="rtl">
                          {church.name_ar}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{church.country}</p>
                    </div>

                    {membership.is_active && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    {switchingId === membership.church_id && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
