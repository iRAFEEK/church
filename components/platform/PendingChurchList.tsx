'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Check, X, Phone, Mail, User, Building2, Globe, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'

export interface PendingChurch {
  id: string
  name: string
  name_ar: string | null
  country: string
  created_at: string
  pending_contact_name: string | null
  pending_contact_email: string | null
  pending_contact_phone: string | null
}

export function PendingChurchList({ initialChurches }: { initialChurches: PendingChurch[] }) {
  const t = useTranslations('platformChurches')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [churches, setChurches] = useState(initialChurches)
  const [busy, setBusy] = useState<string | null>(null)

  async function review(id: string, action: 'approve' | 'reject') {
    if (busy) return
    setBusy(id)
    try {
      const res = await fetch('/api/platform/churches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ church_id: id, action }),
      })
      if (!res.ok) throw new Error()
      setChurches((prev) => prev.filter((c) => c.id !== id))
      toast.success(action === 'approve' ? t('approvedToast') : t('rejectedToast'))
    } catch {
      toast.error(t('errorToast'))
    } finally {
      setBusy(null)
    }
  }

  if (churches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('emptyTitle')}</h3>
        <p className="text-sm text-zinc-500 max-w-[280px]">{t('emptyBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {churches.map((c) => {
        const name = (isAr ? c.name_ar || c.name : c.name || c.name_ar) || t('unnamed')
        return (
          <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900">{name}</p>
                <div className="text-sm text-zinc-500 space-y-0.5 mt-1">
                  <p className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span>{c.country}</span>
                  </p>
                  {c.pending_contact_name && (
                    <p className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate">{c.pending_contact_name}</span>
                    </p>
                  )}
                  {c.pending_contact_phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span dir="ltr">{c.pending_contact_phone}</span>
                    </p>
                  )}
                  {c.pending_contact_email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span dir="ltr" className="truncate">{c.pending_contact_email}</span>
                    </p>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{formatDistanceToNow(c.created_at, locale)}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 h-11"
                disabled={busy === c.id}
                onClick={() => review(c.id, 'approve')}
              >
                {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
                {t('approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-11"
                disabled={busy === c.id}
                onClick={() => review(c.id, 'reject')}
              >
                <X className="h-4 w-4 me-1" />
                {t('reject')}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
