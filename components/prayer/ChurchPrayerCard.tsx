'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check, Archive, Trash2, EyeOff, X } from 'lucide-react'
import { PrayerAssignDialog } from './PrayerAssignDialog'

interface Submitter {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

interface Assignee {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

export interface Prayer {
  id: string
  content: string
  is_anonymous: boolean
  status: string
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
  assigned_to: string | null
  submitter: Submitter | null
  assignee: Assignee | null
}

interface Props {
  prayer: Prayer
  onMarkAnswered?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  onAssigned?: () => void
  onUnassign?: (id: string) => void
  showActions?: boolean
}

export function ChurchPrayerCard({ prayer, onMarkAnswered, onArchive, onDelete, onAssigned, onUnassign, showActions = true }: Props) {
  const t = useTranslations('churchPrayer')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const submitterName = prayer.submitter
    ? isAr
      ? `${prayer.submitter.first_name_ar || prayer.submitter.first_name || ''} ${prayer.submitter.last_name_ar || prayer.submitter.last_name || ''}`.trim()
      : `${prayer.submitter.first_name || ''} ${prayer.submitter.last_name || ''}`.trim()
    : null

  const initials = submitterName
    ? submitterName.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  const date = new Date(prayer.created_at).toLocaleDateString(
    isAr ? 'ar-EG' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  )

  return (
    <div className={`p-4 rounded-lg border ${prayer.status === 'answered' ? 'bg-green-50/50 border-green-200' : 'bg-card'}`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{prayer.content}</p>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {prayer.is_anonymous || !prayer.submitter ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" />
              <span className="text-xs">{t('anonymous')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={prayer.submitter.photo_url || undefined} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{submitterName}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">· {date}</span>
          {prayer.status === 'answered' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
              {t('filterAnswered')}
            </Badge>
          )}
          {prayer.assignee && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] flex items-center gap-1">
              {t('assignedTo')}: {isAr
                ? `${prayer.assignee.first_name_ar || prayer.assignee.first_name || ''} ${prayer.assignee.last_name_ar || prayer.assignee.last_name || ''}`.trim()
                : `${prayer.assignee.first_name || ''} ${prayer.assignee.last_name || ''}`.trim()
              }
              {onUnassign && (
                <button type="button" onClick={() => onUnassign(prayer.id)} className="ms-1 hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            {prayer.status === 'active' && !prayer.assigned_to && onAssigned && (
              <PrayerAssignDialog prayerId={prayer.id} onAssigned={onAssigned} />
            )}
            {prayer.status === 'active' && onMarkAnswered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-green-600 hover:text-green-700"
                onClick={() => onMarkAnswered(prayer.id)}
              >
                <Check className="h-3.5 w-3.5 me-1" />
                <span className="text-xs">{t('markAnswered')}</span>
              </Button>
            )}
            {prayer.status === 'active' && onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2"
                onClick={() => onArchive(prayer.id)}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-destructive hover:text-destructive"
                onClick={() => onDelete(prayer.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {prayer.resolved_notes && (
        <div className="mt-2 p-2 rounded bg-green-50 text-xs text-green-800">
          {prayer.resolved_notes}
        </div>
      )}
    </div>
  )
}
