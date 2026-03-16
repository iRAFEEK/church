'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  profileId: string
  trigger?: React.ReactNode
  onSaved?: () => void
}

export function LogVisitDialog({ profileId, trigger, onSaved }: Props) {
  const t = useTranslations('outreach')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [needsFollowup, setNeedsFollowup] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')

  const resetForm = () => {
    setVisitDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setNeedsFollowup(false)
    setFollowupDate('')
    setFollowupNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/outreach/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          visit_date: visitDate,
          notes: notes || null,
          needs_followup: needsFollowup,
          followup_date: followupDate || null,
          followup_notes: followupNotes || null,
        }),
      })

      if (res.ok) {
        resetForm()
        setOpen(false)
        onSaved?.()
        toast.success(t('saved'))
      } else {
        toast.error(t('error'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 me-1" />
            {t('logVisit')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('logNewVisit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visit-date">{t('visitDate')}</Label>
            <Input
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-notes">{t('visitNotes')}</Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="needs-followup"
              checked={needsFollowup}
              onCheckedChange={setNeedsFollowup}
            />
            <Label htmlFor="needs-followup" className="cursor-pointer">
              {t('followupNeeded')}
            </Label>
          </div>

          {needsFollowup && (
            <>
              <div className="space-y-2">
                <Label htmlFor="followup-date">{t('followupDate')}</Label>
                <Input
                  id="followup-date"
                  type="date"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followup-notes">{t('followupNotes')}</Label>
                <Textarea
                  id="followup-notes"
                  value={followupNotes}
                  onChange={e => setFollowupNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
            {t('logVisit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
