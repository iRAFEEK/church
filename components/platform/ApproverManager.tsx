'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ShieldCheck, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/logger'

type ApproverRow = { email: string; source: 'env' | 'table'; removable: boolean }

export function ApproverManager() {
  const t = useTranslations('platformAdmins')
  const [admins, setAdmins] = useState<ApproverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/platform/admins', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { if (!controller.signal.aborted) setAdmins(Array.isArray(data.admins) ? data.admins : []) })
      .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') logger.error('Failed to load approvers', { module: 'platform', error: e }) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/platform/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('errorToast'))
        return
      }
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
      setEmail('')
      toast.success(t('addedToast'))
    } catch {
      toast.error(t('errorToast'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(target: string) {
    if (removing) return
    setRemoving(target)
    try {
      const res = await fetch('/api/platform/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('errorToast'))
        return
      }
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
      toast.success(t('removedToast'))
    } catch {
      toast.error(t('errorToast'))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <h2 className="text-lg font-semibold text-zinc-900">{t('title')}</h2>
      </div>
      <p className="text-sm text-zinc-500 mb-4">{t('subtitle')}</p>

      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          type="email"
          inputMode="email"
          dir="ltr"
          className="text-base"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={t('emailPlaceholder')}
        />
        <Button type="submit" className="h-11 shrink-0" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 me-1" />}
          {t('addButton')}
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {admins.map((a) => (
            <li key={a.email} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate" dir="ltr">{a.email}</p>
                {a.source === 'env' && (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                    <Lock className="h-3 w-3" /> {t('ownerBadge')}
                  </span>
                )}
              </div>
              {a.removable ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                  disabled={removing === a.email}
                  onClick={() => remove(a.email)}
                  aria-label={t('removeLabel')}
                >
                  {removing === a.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              ) : (
                <span className="w-9 shrink-0" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
