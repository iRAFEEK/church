'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Undo2, Check, X, Clock, ShieldCheck } from 'lucide-react'

type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late'

type Member = {
  profile_id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
  attendance_status: string
}

const STATUS_STYLE: Record<AttendanceStatus, { color: string; bg: string; label: string }> = {
  present: { color: 'text-green-700', bg: 'bg-green-500', label: 'statusPresent' },
  late:    { color: 'text-yellow-700', bg: 'bg-yellow-500', label: 'statusLate' },
  excused: { color: 'text-blue-700', bg: 'bg-blue-500', label: 'statusExcused' },
  absent:  { color: 'text-zinc-500', bg: 'bg-zinc-400', label: 'statusAbsent' },
}

interface SwipeAttendanceProps {
  gatheringId: string
  groupId: string
  members: Member[]
  canManage: boolean
  isCompleted: boolean
}

export function SwipeAttendance({
  gatheringId,
  groupId,
  members: initialMembers,
  canManage,
  isCompleted,
}: SwipeAttendanceProps) {
  const t = useTranslations('attendance')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const router = useRouter()

  const [members, setMembers] = useState(initialMembers)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<{ index: number; status: AttendanceStatus }[]>([])
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  // Touch tracking
  const startX = useRef(0)
  const currentX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const markStatus = useCallback((status: AttendanceStatus) => {
    if (currentIndex >= members.length) return

    setHistory(prev => [...prev, { index: currentIndex, status }])
    setMembers(prev => prev.map((m, i) =>
      i === currentIndex ? { ...m, attendance_status: status } : m
    ))

    // Flash animation
    setSwipeDirection(status === 'present' || status === 'late' ? 'right' : 'left')
    setTimeout(() => {
      setSwipeDirection(null)
      if (currentIndex + 1 >= members.length) {
        setShowSummary(true)
      } else {
        setCurrentIndex(prev => prev + 1)
      }
    }, 300)
  }, [currentIndex, members.length])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setMembers(prev => prev.map((m, i) =>
      i === last.index ? { ...m, attendance_status: 'absent' } : m
    ))
    setShowSummary(false)
    setCurrentIndex(last.index)
  }, [history])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`
      cardRef.current.style.opacity = `${1 - Math.abs(diff) / 400}`
    }
  }

  const handleTouchEnd = () => {
    const diff = currentX.current - startX.current
    if (cardRef.current) {
      cardRef.current.style.transform = ''
      cardRef.current.style.opacity = ''
    }
    // Adjust for RTL: in RTL, swipe right means absent, swipe left means present
    const threshold = 80
    if (Math.abs(diff) > threshold) {
      const isSwipeRight = diff > 0
      const statusForSwipe = isRTL
        ? (isSwipeRight ? 'absent' : 'present')
        : (isSwipeRight ? 'present' : 'absent')
      markStatus(statusForSwipe)
    }
  }

  async function submitAttendance() {
    setSubmitting(true)
    try {
      const records = members.map(m => ({
        profile_id: m.profile_id,
        status: m.attendance_status,
      }))

      const res = await fetch(`/api/gatherings/${gatheringId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      })
      if (!res.ok) throw new Error()
      toast.success(t('toastSaved'))
      router.refresh()
    } catch {
      toast.error(t('toastSaveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const presentCount = members.filter(m => ['present', 'late'].includes(m.attendance_status)).length
  const absentCount = members.filter(m => m.attendance_status === 'absent').length
  const lateCount = members.filter(m => m.attendance_status === 'late').length
  const excusedCount = members.filter(m => m.attendance_status === 'excused').length

  // Summary screen
  if (showSummary) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-center text-zinc-900">{t('sectionTitle')}</h2>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label={t('statusPresent')} count={presentCount} color="bg-green-100 text-green-700" />
          <SummaryCard label={t('statusAbsent')} count={absentCount} color="bg-zinc-100 text-zinc-600" />
          <SummaryCard label={t('statusLate')} count={lateCount} color="bg-yellow-100 text-yellow-700" />
          <SummaryCard label={t('statusExcused')} count={excusedCount} color="bg-blue-100 text-blue-700" />
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-green-500 rounded-full transition-all"
            style={{ width: `${members.length > 0 ? (presentCount / members.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-center text-sm text-zinc-500">
          {t('presentCount', { present: presentCount, total: members.length })}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 min-h-[48px]"
            onClick={undo}
            disabled={history.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            {t('undo') || 'Undo'}
          </Button>
          <Button
            className="flex-1 min-h-[48px] bg-green-600 hover:bg-green-700"
            onClick={submitAttendance}
            disabled={submitting}
          >
            {submitting ? t('saving') : t('saveButton')}
          </Button>
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <p className="text-sm text-zinc-400">{t('emptyMembers')}</p>
      </div>
    )
  }

  const member = members[currentIndex]
  if (!member) return null

  const name = `${member.first_name_ar || member.first_name || ''} ${member.last_name_ar || member.last_name || ''}`.trim()
  const initials = (member.first_name_ar || member.first_name || '?')[0].toUpperCase()

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Progress */}
      <div className="px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>{currentIndex + 1} / {members.length}</span>
          {history.length > 0 && (
            <button onClick={undo} className="flex items-center gap-1 text-primary hover:underline text-xs">
              <Undo2 className="h-3 w-3" />
              {t('undo') || 'Undo'}
            </button>
          )}
        </div>
        <div className="h-1.5 bg-zinc-100 rounded-full mt-2 overflow-hidden">
          <div
            className="h-1.5 bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / members.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="relative px-4 py-8">
        {/* Swipe hints */}
        <div className={cn(
          'absolute top-1/2 -translate-y-1/2 text-xs font-semibold transition-opacity',
          isRTL ? 'right-2' : 'left-2',
          swipeDirection === 'left' ? 'opacity-100' : 'opacity-30'
        )}>
          <span className="text-zinc-400">{isRTL ? t('statusPresent') : t('statusAbsent')}</span>
        </div>
        <div className={cn(
          'absolute top-1/2 -translate-y-1/2 text-xs font-semibold transition-opacity',
          isRTL ? 'left-2' : 'right-2',
          swipeDirection === 'right' ? 'opacity-100' : 'opacity-30'
        )}>
          <span className="text-green-500">{isRTL ? t('statusAbsent') : t('statusPresent')}</span>
        </div>

        <div
          ref={cardRef}
          className={cn(
            'flex flex-col items-center transition-all duration-300',
            swipeDirection === 'right' && 'translate-x-[120%] opacity-0',
            swipeDirection === 'left' && '-translate-x-[120%] opacity-0',
          )}
          onTouchStart={canManage && !isCompleted ? handleTouchStart : undefined}
          onTouchMove={canManage && !isCompleted ? handleTouchMove : undefined}
          onTouchEnd={canManage && !isCompleted ? handleTouchEnd : undefined}
        >
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={member.photo_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-semibold text-zinc-900">{name}</h3>
        </div>
      </div>

      {/* Action buttons */}
      {canManage && !isCompleted && (
        <div className="border-t border-zinc-100 p-4">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => markStatus('present')}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 hover:bg-green-100 active:scale-95 transition-all"
            >
              <Check className="h-6 w-6 text-green-600" />
              <span className="text-[10px] font-medium text-green-700">{t('statusPresent')}</span>
            </button>
            <button
              onClick={() => markStatus('late')}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-yellow-50 hover:bg-yellow-100 active:scale-95 transition-all"
            >
              <Clock className="h-6 w-6 text-yellow-600" />
              <span className="text-[10px] font-medium text-yellow-700">{t('statusLate')}</span>
            </button>
            <button
              onClick={() => markStatus('excused')}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
            >
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <span className="text-[10px] font-medium text-blue-700">{t('statusExcused')}</span>
            </button>
            <button
              onClick={() => markStatus('absent')}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 active:scale-95 transition-all"
            >
              <X className="h-6 w-6 text-zinc-500" />
              <span className="text-[10px] font-medium text-zinc-600">{t('statusAbsent')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn('rounded-xl p-4 text-center', color)}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
    </div>
  )
}
