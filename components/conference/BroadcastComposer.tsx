'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Send, Megaphone, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Broadcast {
  id: string
  message: string
  message_ar: string | null
  is_urgent: boolean
  scope: string
  team_id: string | null
  area_id: string | null
  created_at: string
  sender: { first_name: string; last_name: string; first_name_ar?: string | null; last_name_ar?: string | null } | null
}

interface Props {
  eventId: string
  churchId: string
  initialBroadcasts: Broadcast[]
  teams: Array<{ id: string; name: string; name_ar: string | null }>
  areas: Array<{ id: string; name: string; name_ar: string | null }>
  locale: string
}

export function BroadcastComposer({ eventId, churchId, initialBroadcasts, teams, areas, locale }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts)
  const [message, setMessage] = useState('')
  const [messageAr, setMessageAr] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [scope, setScope] = useState<'all' | 'area' | 'team'>('all')
  const [teamId, setTeamId] = useState<string>('')
  const [areaId, setAreaId] = useState<string>('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    if (scope === 'team' && !teamId) { toast.error(t('selectTeam')); return }
    if (scope === 'area' && !areaId) { toast.error(t('filterByArea')); return }
    if (sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          message_ar: messageAr.trim() || null,
          is_urgent: isUrgent,
          scope,
          team_id: scope === 'team' ? teamId : null,
          area_id: scope === 'area' ? areaId : null,
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setBroadcasts((prev) => [data, ...prev])
      setMessage('')
      setMessageAr('')
      setIsUrgent(false)
      toast.success(t('sendBroadcast'))
    } catch {
      toast.error('Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  const getSenderName = (sender: Broadcast['sender']) => {
    if (!sender) return '—'
    if (isRTL && (sender.first_name_ar || sender.last_name_ar)) {
      return `${sender.first_name_ar || ''} ${sender.last_name_ar || ''}`.trim()
    }
    return `${sender.first_name} ${sender.last_name}`.trim()
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {t('sendBroadcast')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scope selector */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'area', 'team'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm border transition-colors min-h-[44px]',
                  scope === s ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'
                )}
              >
                {t(s === 'all' ? 'broadcastToAll' : s === 'area' ? 'broadcastToArea' : 'broadcastToTeam')}
              </button>
            ))}
          </div>

          {/* Team/area picker */}
          {scope === 'team' && (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('selectTeam')} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {isRTL ? (team.name_ar || team.name) : team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {scope === 'area' && (
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('filterByArea')} />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {isRTL ? (area.name_ar || area.name) : area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-msg">{t('broadcastMessage')}</Label>
            <Textarea
              id="broadcast-msg"
              placeholder={isRTL ? 'نص الرسالة...' : 'Message text...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              dir="auto"
              className="text-base min-h-[80px]"
            />
          </div>

          {/* Arabic message (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="broadcast-msg-ar">{t('messageAr')}</Label>
            <Textarea
              id="broadcast-msg-ar"
              placeholder="نص الرسالة بالعربية (اختياري)..."
              value={messageAr}
              onChange={(e) => setMessageAr(e.target.value)}
              dir="rtl"
              className="text-base min-h-[60px]"
            />
          </div>

          {/* Urgent toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="urgent"
              checked={isUrgent}
              onCheckedChange={setIsUrgent}
            />
            <Label htmlFor="urgent" className="flex items-center gap-1.5 cursor-pointer">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {t('isUrgent')}
            </Label>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="h-11"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Send className="h-4 w-4 me-2" />
            )}
            {sending ? t('sending') : t('sendBroadcast')}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-3">
        {broadcasts.length === 0 && (
          <div className="text-center py-10">
            <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">{t('emptyBroadcasts')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('emptyBroadcastsDesc')}</p>
          </div>
        )}

        {broadcasts.map((bc) => (
          <div
            key={bc.id}
            className={cn(
              'rounded-xl border p-4 space-y-2',
              bc.is_urgent && 'border-red-200 bg-red-50'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium flex-1">{isRTL && bc.message_ar ? bc.message_ar : bc.message}</p>
              {bc.is_urgent && (
                <Badge className="shrink-0 bg-red-100 text-red-700 text-xs">
                  {t('urgentBroadcast')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span>{getSenderName(bc.sender)}</span>
              <span>·</span>
              <span dir="ltr">{new Date(bc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <Badge variant="outline" className="text-xs">
                {bc.scope === 'all' ? t('broadcastToAll') : bc.scope === 'area' ? t('broadcastToArea') : t('broadcastToTeam')}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
