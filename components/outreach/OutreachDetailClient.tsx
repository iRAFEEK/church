'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogVisitDialog } from './LogVisitDialog'
import { VisitHistoryList } from './VisitHistoryList'
import { OutreachAssignmentPanel } from './OutreachAssignmentPanel'
import { toast } from 'sonner'

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
  profileId: string
  currentUserId: string
  visits: Visit[]
}

export function OutreachDetailClient({ profileId, currentUserId, visits: initialVisits }: Props) {
  const t = useTranslations('outreach')
  const router = useRouter()
  const [visits, setVisits] = useState(initialVisits)

  const handleDeleteVisit = async (id: string) => {
    const res = await fetch(`/api/outreach/visits/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setVisits(prev => prev.filter(v => v.id !== id))
      toast.success(t('deleted'))
    } else {
      toast.error(t('error'))
    }
  }

  const handleVisitSaved = () => {
    router.refresh()
  }

  return (
    <>
      {/* Visit History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('visitHistory')}</CardTitle>
          <LogVisitDialog profileId={profileId} onSaved={handleVisitSaved} />
        </CardHeader>
        <CardContent>
          <VisitHistoryList visits={visits} onDelete={handleDeleteVisit} />
        </CardContent>
      </Card>

      {/* Outreach Assignments */}
      <OutreachAssignmentPanel
        memberId={profileId}
        currentUserId={currentUserId}
        canManage={true}
      />
    </>
  )
}
