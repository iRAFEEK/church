'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type NewLeader = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeaderCreated: (leader: NewLeader) => void
}

export function RegisterLeaderDialog({ open, onOpenChange, onLeaderCreated }: Props) {
  const t = useTranslations('leaderRegistration')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    first_name_ar: '',
    last_name_ar: '',
    phone: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm({ email: '', first_name: '', last_name: '', first_name_ar: '', last_name_ar: '', phone: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.email || !form.first_name || !form.last_name) {
      toast.error(t('validationRequired'))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      toast.error(t('validationEmail'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leaders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(t('errorEmailTaken'))
        } else {
          toast.error(json.error || t('errorGeneric'))
        }
        return
      }

      if (json.promoted) toast.success(t('toastPromoted'))
      else if (json.existing) toast.info(t('toastExisting'))
      else toast.success(t('toastCreated'))

      onLeaderCreated(json.data)
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('email')}</Label>
            <Input
              type="email"
              dir="ltr"
              placeholder={t('emailPlaceholder')}
              value={form.email}
              onChange={e => update('email', e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('firstName')}</Label>
              <Input
                dir="ltr"
                value={form.first_name}
                onChange={e => update('first_name', e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('lastName')}</Label>
              <Input
                dir="ltr"
                value={form.last_name}
                onChange={e => update('last_name', e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('firstNameAr')}</Label>
              <Input
                dir="rtl"
                value={form.first_name_ar}
                onChange={e => update('first_name_ar', e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('lastNameAr')}</Label>
              <Input
                dir="rtl"
                value={form.last_name_ar}
                onChange={e => update('last_name_ar', e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('phone')}</Label>
            <Input
              type="tel"
              dir="ltr"
              placeholder={t('phonePlaceholder')}
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t('submitting')}
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
