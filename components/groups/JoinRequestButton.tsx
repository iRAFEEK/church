'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { UserPlus, Clock, Loader2 } from 'lucide-react'

interface JoinRequestButtonProps {
  groupId: string
  hasPendingRequest: boolean
}

export function JoinRequestButton({ groupId, hasPendingRequest }: JoinRequestButtonProps) {
  const t = useTranslations('groups')
  const [pending, setPending] = useState(hasPendingRequest)
  const [loading, setLoading] = useState(false)

  async function handleRequest() {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setPending(true)
        toast.success(t('joinRequestSent'))
      } else {
        const data = await res.json()
        toast.error(data.error || t('joinRequestError'))
      }
    } catch {
      toast.error(t('joinRequestError'))
    } finally {
      setLoading(false)
    }
  }

  if (pending) {
    return (
      <Button variant="outline" disabled className="min-h-[44px]">
        <Clock className="h-4 w-4 me-2" />
        {t('joinRequestPending')}
      </Button>
    )
  }

  return (
    <Button onClick={handleRequest} disabled={loading} className="min-h-[44px]">
      {loading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <UserPlus className="h-4 w-4 me-2" />}
      {t('requestToJoin')}
    </Button>
  )
}
