'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  onSubmitted?: () => void
}

export function ChurchPrayerForm({ onSubmitted }: Props) {
  const t = useTranslations('churchPrayer')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    try {
      const res = await fetch('/api/church-prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), is_anonymous: isAnonymous }),
      })

      if (res.ok) {
        setContent('')
        setIsAnonymous(false)
        setSubmitted(true)
        onSubmitted?.()
        setTimeout(() => setSubmitted(false), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('submitTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-6 text-green-600">
            <CheckCircle2 className="h-10 w-10" />
            <p className="text-sm font-medium">{t('submitted')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prayer-content">{t('contentLabel')}</Label>
              <Textarea
                id="prayer-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('contentPlaceholder')}
                rows={4}
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <div>
                <Label htmlFor="anonymous" className="cursor-pointer">{t('anonymousLabel')}</Label>
                <p className="text-xs text-muted-foreground">{t('anonymousHint')}</p>
              </div>
            </div>

            <Button type="submit" disabled={loading || !content.trim()} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              {t('submitButton')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
