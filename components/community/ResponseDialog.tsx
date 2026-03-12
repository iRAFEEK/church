'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { HandHelping, Loader2 } from 'lucide-react'

interface ResponseDialogProps {
  needId: string
}

export function ResponseDialog({ needId }: ResponseDialogProps) {
  const t = useTranslations('churchNeeds')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/community/needs/${needId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          message_ar: isAr ? message : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setOpen(false)
      setMessage('')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <HandHelping className="h-4 w-4 me-2" />
          {t('offerHelp')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('offerHelp')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('yourMessage')}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              dir="auto"
              placeholder={t('yourMessage')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !message}>
              {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('sendOffer')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
