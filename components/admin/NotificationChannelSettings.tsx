'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MessageCircle, BellRing } from 'lucide-react'

interface Props {
  initialWhatsappEnabled: boolean
}

export function NotificationChannelSettings({ initialWhatsappEnabled }: Props) {
  const t = useTranslations('settings')
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialWhatsappEnabled)
  const [saving, setSaving] = useState(false)

  const handleToggle = async (next: boolean) => {
    if (saving) return
    const previous = whatsappEnabled
    setWhatsappEnabled(next) // optimistic
    setSaving(true)
    try {
      const res = await fetch('/api/churches/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_notifications_enabled: next }),
      })
      if (!res.ok) {
        setWhatsappEnabled(previous) // revert
        toast.error(t('notificationsSaveFailed'))
        return
      }
      toast.success(t('notificationsSaved'))
    } catch {
      setWhatsappEnabled(previous) // revert
      toast.error(t('notificationsSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="w-4 h-4" />
          {t('notificationsTitle')}
        </CardTitle>
        <CardDescription>{t('notificationsSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* In-app push — always on, free */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          <BellRing className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('notificationsPushAlwaysOn')}</p>
        </div>

        {/* WhatsApp opt-in toggle */}
        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-start gap-3 min-w-0">
            <MessageCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <Label htmlFor="whatsapp-notifications" className="text-sm font-medium">
                {t('notificationsWhatsappLabel')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('notificationsWhatsappHelp')}
              </p>
            </div>
          </div>
          <Switch
            id="whatsapp-notifications"
            checked={whatsappEnabled}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label={t('notificationsWhatsappLabel')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
