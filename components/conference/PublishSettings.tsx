'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Globe, Loader2, Eye, Radio } from 'lucide-react'

interface Props {
  eventId: string
  conferenceMode: boolean
  settings: Record<string, unknown>
  locale: string
}

export function PublishSettings({ eventId, conferenceMode, settings, locale }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [mode, setMode] = useState(conferenceMode)
  const [showMinistries, setShowMinistries] = useState(Boolean(settings.show_ministries))
  const [showSchedule, setShowSchedule] = useState(Boolean(settings.show_schedule))
  const [allowPublic, setAllowPublic] = useState(Boolean(settings.allow_public))
  const [notifyOnPublish, setNotifyOnPublish] = useState(Boolean(settings.notify_on_publish))
  const [tagline, setTagline] = useState(String(settings.public_tagline || ''))
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const handleToggleMode = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conference_mode: !mode }),
      })
      if (!res.ok) throw new Error()
      setMode(!mode)
      toast.success(!mode ? t('modeOn') : t('modeOff'))
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conference_settings: {
            show_ministries: showMinistries,
            show_schedule: showSchedule,
            allow_public: allowPublic,
            notify_on_publish: notifyOnPublish,
            public_tagline: tagline,
          },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isRTL ? 'تم الحفظ' : 'Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (publishing) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_church: notifyOnPublish }),
      })
      if (!res.ok) throw new Error()
      toast.success(t('conferencePublished'))
    } catch {
      toast.error('Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Mode toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-5 w-5" />
            {t('mode')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{mode ? t('modeOn') : t('modeOff')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode ? t('disableConferenceMode') : t('enableConferenceMode')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={mode ? 'default' : 'secondary'}>
                {mode ? 'ON' : 'OFF'}
              </Badge>
              <Switch checked={mode} onCheckedChange={handleToggleMode} disabled={saving} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('publish')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-ministries" className="text-sm cursor-pointer">{t('showMinistries')}</Label>
              <Switch id="show-ministries" checked={showMinistries} onCheckedChange={setShowMinistries} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-schedule" className="text-sm cursor-pointer">{t('showSchedule')}</Label>
              <Switch id="show-schedule" checked={showSchedule} onCheckedChange={setShowSchedule} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-public" className="text-sm cursor-pointer">{t('allowPublic')}</Label>
              <Switch id="allow-public" checked={allowPublic} onCheckedChange={setAllowPublic} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-publish" className="text-sm cursor-pointer">{t('notifyChurchOnPublish')}</Label>
              <Switch id="notify-publish" checked={notifyOnPublish} onCheckedChange={setNotifyOnPublish} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tagline">{t('publicTagline')}</Label>
            <Input
              id="tagline"
              value={tagline}
              dir="auto"
              className="text-base"
              onChange={(e) => setTagline(e.target.value)}
              placeholder={isRTL ? 'شعار المؤتمر...' : 'Conference tagline...'}
            />
          </div>

          <Button
            variant="outline"
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full h-11"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
            {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
          </Button>

          <Button
            onClick={handlePublish}
            disabled={publishing || !mode}
            className="w-full h-11"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Eye className="h-4 w-4 me-2" />
            )}
            {t('publishConference')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
