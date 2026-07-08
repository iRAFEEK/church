'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Check, X, Phone, Mail, UserPlus, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'

export interface JoinRequest {
  id: string
  profile_id: string
  message: string | null
  created_at: string
  requester_name: string | null
  requester_name_ar: string | null
  requester_phone: string | null
  requester_email: string | null
}

export function JoinRequestList({ initialRequests }: { initialRequests: JoinRequest[] }) {
  const t = useTranslations('joinRequests')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [requests, setRequests] = useState(initialRequests)
  const [busy, setBusy] = useState<string | null>(null)

  async function respond(id: string, action: 'approved' | 'rejected') {
    setBusy(id)
    try {
      const res = await fetch('/api/churches/join-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id, action }),
      })
      if (!res.ok) throw new Error()
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast.success(action === 'approved' ? t('approvedToast') : t('rejectedToast'))
    } catch {
      toast.error(t('errorToast'))
    } finally {
      setBusy(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <UserPlus className="h-8 w-8 text-zinc-500" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('emptyTitle')}</h3>
        <p className="text-sm text-zinc-500 max-w-[280px]">{t('emptyBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => {
        const name = (isAr
          ? r.requester_name_ar || r.requester_name
          : r.requester_name || r.requester_name_ar) || ''
        const initials = (name || '؟').slice(0, 1)
        return (
          <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900">{name || t('unnamed')}</p>
                <div className="text-sm text-zinc-500 space-y-0.5 mt-0.5">
                  {r.requester_phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span dir="ltr">{r.requester_phone}</span>
                    </p>
                  )}
                  {r.requester_email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span dir="ltr" className="truncate">{r.requester_email}</span>
                    </p>
                  )}
                </div>
                {r.message && <p className="text-sm text-zinc-600 mt-2 bg-zinc-50 rounded-lg p-2">{r.message}</p>}
                <p className="text-xs text-zinc-500 mt-1">{formatDistanceToNow(r.created_at, locale)}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 h-10"
                disabled={busy === r.id}
                onClick={() => respond(r.id, 'approved')}
              >
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
                {t('approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-10"
                disabled={busy === r.id}
                onClick={() => respond(r.id, 'rejected')}
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
