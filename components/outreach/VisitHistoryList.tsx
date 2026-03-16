'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Calendar, Trash2, AlertCircle } from 'lucide-react'

interface Visit {
  id: string
  visit_date: string
  notes: string | null
  needs_followup: boolean
  followup_date: string | null
  followup_notes: string | null
  visitor?: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
}

interface Props {
  visits: Visit[]
  onDelete?: (id: string) => void
}

export function VisitHistoryList({ visits, onDelete }: Props) {
  const t = useTranslations('outreach')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
          <Calendar className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">{t('noVisitsTitle')}</h3>
        <p className="text-xs text-zinc-500 max-w-[220px]">{t('noVisitsBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visits.map(visit => {
        const visitorName = visit.visitor
          ? isAr
            ? `${visit.visitor.first_name_ar || visit.visitor.first_name || ''} ${visit.visitor.last_name_ar || visit.visitor.last_name || ''}`.trim()
            : `${visit.visitor.first_name || ''} ${visit.visitor.last_name || ''}`.trim()
          : null

        const initials = visitorName
          ? visitorName.split(' ').map(n => n[0]).join('').slice(0, 2)
          : '?'

        return (
          <div key={visit.id} className="p-3 rounded-xl border bg-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {new Date(visit.visit_date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {visit.needs_followup && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                    <AlertCircle className="h-3 w-3 me-1" />
                    {t('needsFollowup')}
                  </Badge>
                )}
              </div>
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteVisitTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('deleteVisitBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('deleteVisitCancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(visit.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('deleteVisitConfirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {visit.notes && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{visit.notes}</p>
            )}

            {visit.visitor && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">{t('visitedBy')}:</span>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={visit.visitor.photo_url || undefined} />
                  <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{visitorName}</span>
              </div>
            )}

            {visit.followup_date && (
              <div className="mt-2 p-2 rounded bg-orange-50/50 text-xs">
                <span className="font-medium">{t('followupDate')}: </span>
                {new Date(visit.followup_date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                {visit.followup_notes && <span className="ms-2">— {visit.followup_notes}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
