'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AttendanceRoster } from './AttendanceRoster'
import { SwipeAttendance } from './SwipeAttendance'
import { cn } from '@/lib/utils'
import { List, CreditCard } from 'lucide-react'

type Member = {
  profile_id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
  attendance_status: string
}

interface AttendanceSectionProps {
  gatheringId: string
  groupId: string
  members: Member[]
  canManage: boolean
  isCompleted: boolean
}

export function AttendanceSection(props: AttendanceSectionProps) {
  const t = useTranslations('attendance')
  const [isMobile, setIsMobile] = useState(false)
  const [mode, setMode] = useState<'swipe' | 'list'>('swipe')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Default: swipe on mobile, list on desktop
  useEffect(() => {
    setMode(isMobile ? 'swipe' : 'list')
  }, [isMobile])

  return (
    <div>
      {/* View toggle */}
      {props.canManage && !props.isCompleted && props.members.length > 0 && (
        <div className="flex items-center justify-end gap-1 mb-3">
          <button
            onClick={() => setMode('swipe')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              mode === 'swipe' ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            {t('swipeView') || 'Cards'}
          </button>
          <button
            onClick={() => setMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              mode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            )}
          >
            <List className="h-3.5 w-3.5" />
            {t('listView') || 'List'}
          </button>
        </div>
      )}

      {mode === 'swipe' ? (
        <SwipeAttendance {...props} />
      ) : (
        <AttendanceRoster {...props} />
      )}
    </div>
  )
}
