'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, X, Loader2 } from 'lucide-react'

interface JoinRequest {
  id: string
  profile_id: string
  message: string | null
  created_at: string
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
}

interface PendingJoinRequestsProps {
  groupId: string
  requests: JoinRequest[]
}

export function PendingJoinRequests({ groupId, requests: initialRequests }: PendingJoinRequestsProps) {
  const t = useTranslations('groups')
  const [requests, setRequests] = useState(initialRequests)
  const [processing, setProcessing] = useState<string | null>(null)

  if (requests.length === 0) return null

  async function handleRespond(requestId: string, action: 'approved' | 'rejected') {
    setProcessing(requestId)
    try {
      const res = await fetch(`/api/groups/${groupId}/join-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId))
        toast.success(action === 'approved' ? t('joinRequestApproved') : t('joinRequestRejected'))
      } else {
        toast.error(t('joinRequestError'))
      }
    } catch {
      toast.error(t('joinRequestError'))
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
      <p className="text-sm font-medium text-amber-700 mb-3">
        {t('pendingJoinRequests')} ({requests.length})
      </p>
      <div className="space-y-3">
        {requests.map(req => {
          const p = req.profile
          if (!p) return null
          const name = `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
          const isProcessing = processing === req.id

          return (
            <div key={req.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={p.photo_url || undefined} />
                  <AvatarFallback className="text-xs">{name[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-amber-900 block truncate">{name}</span>
                  {req.message && (
                    <span className="text-xs text-amber-600 block truncate">{req.message}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleRespond(req.id, 'approved')}
                  disabled={isProcessing}
                  aria-label={t('approveJoinRequest')}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRespond(req.id, 'rejected')}
                  disabled={isProcessing}
                  aria-label={t('rejectJoinRequest')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
