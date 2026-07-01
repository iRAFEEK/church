'use client'

// Onboarding FIX 3 — a small surface for a person who has been INVITED to another
// church (their phone already existed when a leader "added" them). Self-fetches the
// caller's own pending invitations and lets them accept (join) or decline. Renders
// nothing when there are none, so it is safe to mount unconditionally on the dashboard.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Building2, Check, X, Loader2, MailPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

interface Invitation {
  church_id: string
  role: string
  created_at: string
  church: {
    id: string
    name: string
    name_ar: string | null
    country: string | null
  } | null
}

export function PendingInvitations() {
  const t = useTranslations('invitations')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/churches/invitations', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('load failed')
        return r.json()
      })
      .then((json) => setInvitations(json.data ?? []))
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('Load invitations failed', { module: 'invitations', error: err })
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  async function respond(churchId: string, action: 'accept' | 'decline') {
    setBusy(churchId)
    try {
      const res = await fetch('/api/churches/invitations', {
        method: action === 'accept' ? 'PATCH' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: churchId }),
      })
      if (!res.ok) throw new Error()
      setInvitations((prev) => prev.filter((i) => i.church_id !== churchId))
      toast.success(action === 'accept' ? t('acceptedToast') : t('declinedToast'))
      if (action === 'accept') {
        // Membership now active — refresh so the church switcher / access picks it up.
        router.refresh()
      }
    } catch {
      toast.error(t('errorToast'))
    } finally {
      setBusy(null)
    }
  }

  // Silent while loading or when there is nothing to show — this is a banner, not a page.
  if (loading || invitations.length === 0) return null

  return (
    <section
      className="rounded-xl border border-primary/30 bg-primary/5 p-4"
      aria-label={t('title')}
    >
      <div className="flex items-center gap-2 mb-3">
        <MailPlus className="h-5 w-5 text-primary shrink-0" />
        <h2 className="font-semibold text-sm">{t('title')}</h2>
      </div>

      <ul className="space-y-3">
        {invitations.map((inv) => {
          const churchName =
            (isAr
              ? inv.church?.name_ar || inv.church?.name
              : inv.church?.name || inv.church?.name_ar) || t('aChurch')
          return (
            <li
              key={inv.church_id}
              className="rounded-lg border bg-background p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{churchName}</p>
                  <p className="text-sm text-muted-foreground">{t('invitedYou')}</p>
                  {inv.church?.country && (
                    <p className="text-xs text-muted-foreground">{inv.church.country}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-11"
                  disabled={busy === inv.church_id}
                  onClick={() => respond(inv.church_id, 'accept')}
                >
                  {busy === inv.church_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 me-1" />
                  )}
                  {t('accept')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-11"
                  disabled={busy === inv.church_id}
                  onClick={() => respond(inv.church_id, 'decline')}
                >
                  <X className="h-4 w-4 me-1" />
                  {t('decline')}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
