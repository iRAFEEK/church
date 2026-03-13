'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, CheckCircle, Loader2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { NEED_RESPONSE_STATUS_COLORS } from '@/lib/design/tokens'
import { MessageThread } from './MessageThread'
import type { ChurchNeedResponseWithChurch } from '@/types'

interface ResponseListProps {
  needId: string
  responses: ChurchNeedResponseWithChurch[]
  isOwner: boolean
  myChurchId: string
  initialExpandedThread?: string
}

export function ResponseList({ needId, responses, isOwner, myChurchId, initialExpandedThread }: ResponseListProps) {
  const t = useTranslations('churchNeeds')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedThread, setExpandedThread] = useState<string | null>(initialExpandedThread || null)
  const expandedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialExpandedThread && expandedRef.current) {
      expandedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [initialExpandedThread])

  async function updateStatus(responseId: string, status: 'accepted' | 'declined' | 'completed') {
    setLoading(responseId)
    setError(null)
    try {
      const res = await fetch(`/api/community/needs/${needId}/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(null)
    }
  }

  if (responses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{t('noResponses')}</p>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {responses.map((r) => {
        const churchName = isAr
          ? (r.responder_church?.name_ar || r.responder_church?.name)
          : r.responder_church?.name
        const message = isAr ? (r.message_ar || r.message) : r.message
        const isLoading = loading === r.id
        const isExpanded = expandedThread === r.id
        const showMessages = r.status === 'accepted' || r.status === 'completed'

        return (
          <Card key={r.id} ref={r.id === initialExpandedThread ? expandedRef : undefined}>
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {r.responder_church?.logo_url && (
                    <img
                      src={r.responder_church.logo_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">{churchName}</span>
                      {r.responder_church?.country && (
                        <span className="text-xs text-muted-foreground">{r.responder_church.country}</span>
                      )}
                      <Badge className={`text-xs ${NEED_RESPONSE_STATUS_COLORS[r.status as keyof typeof NEED_RESPONSE_STATUS_COLORS]}`} variant="secondary">
                        {t(r.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0 items-end">
                  {isOwner && r.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => updateStatus(r.id, 'accepted')}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => updateStatus(r.id, 'declined')}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {isOwner && r.status === 'accepted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(r.id, 'completed')}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <CheckCircle className="h-4 w-4 me-1" />}
                      {t('markCompleted')}
                    </Button>
                  )}

                  {showMessages && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs gap-1"
                      onClick={() => setExpandedThread(isExpanded ? null : r.id)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t('messages')}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Message thread (expanded) */}
              {isExpanded && showMessages && (
                <div className="mt-3 pt-3 border-t">
                  <MessageThread
                    needId={needId}
                    responseId={r.id}
                    myChurchId={myChurchId}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
