'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { analytics } from '@/lib/analytics'

// E.164: leading "+", 8–15 digits. Mirrors lib/schemas/member.ts so client + server agree.
const PHONE_RE = /^\+\d{8,15}$/

type Props = {
  churchId: string
  role: string
  locale: string
}

const EMPTY = {
  first_name: '',
  last_name: '',
  first_name_ar: '',
  last_name_ar: '',
  phone: '',
}

export function AddMemberDialog({ churchId, role, locale }: Props) {
  const t = useTranslations('addMember')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY)

  function update(field: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error(t('validationRequired'))
      return
    }
    const phone = form.phone.trim()
    if (phone && !PHONE_RE.test(phone)) {
      toast.error(t('validationPhone'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          first_name_ar: form.first_name_ar.trim() || null,
          last_name_ar: form.last_name_ar.trim() || null,
          phone: phone || null,
        }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(t('errorAlreadyMember'))
        } else {
          toast.error(t('errorGeneric'))
        }
        return
      }

      analytics.member.created({ church_id: churchId, role, locale, method: 'manual' })
      if (json?.data?.added === 'invited') {
        // Cross-church: the person already belongs to another church — they were sent
        // an invitation and only join once they accept (they are NOT added yet).
        toast.success(t('toastInvited'), { description: t('toastInvitedDescription') })
      } else {
        toast.success(t('toastCreated'), {
          description: phone ? t('toastCreatedDescriptionPhone') : t('toastCreatedDescriptionNoPhone'),
        })
      }
      setForm(EMPTY)
      setOpen(false)
      router.refresh()
    } catch {
      toast.error(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 w-full sm:w-auto">
          <UserPlus className="h-4 w-4 me-2" />
          {t('addButton')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="member-first-name" className="mb-1 block text-sm text-muted-foreground">{t('firstName')}</Label>
              <Input
                id="member-first-name"
                aria-required="true"
                dir="auto"
                className="h-11 text-base"
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="member-last-name" className="mb-1 block text-sm text-muted-foreground">{t('lastName')}</Label>
              <Input
                id="member-last-name"
                aria-required="true"
                dir="auto"
                className="h-11 text-base"
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="member-first-name-ar" className="mb-1 block text-sm text-muted-foreground">{t('firstNameAr')}</Label>
              <Input
                id="member-first-name-ar"
                dir="auto"
                className="h-11 text-base"
                value={form.first_name_ar}
                onChange={(e) => update('first_name_ar', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="member-last-name-ar" className="mb-1 block text-sm text-muted-foreground">{t('lastNameAr')}</Label>
              <Input
                id="member-last-name-ar"
                dir="auto"
                className="h-11 text-base"
                value={form.last_name_ar}
                onChange={(e) => update('last_name_ar', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="member-phone" className="mb-1 block text-sm text-muted-foreground">{t('phoneOptional')}</Label>
            <Input
              id="member-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder={t('phonePlaceholder')}
              className="h-11 text-base"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('phoneHint')}</p>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={loading}>
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
