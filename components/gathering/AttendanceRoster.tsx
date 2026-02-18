'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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

const STATUS_KEYS: Record<AttendanceStatus, string> = {
  present: 'statusPresent',
  late:    'statusLate',
  excused: 'statusExcused',
  absent:  'statusAbsent',
}

const STATUS_STYLE: Record<AttendanceStatus, { color: string; bg: string }> = {
  present: { color: 'text-green-700', bg: 'bg-green-100' },
  late:    { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  excused: { color: 'text-blue-700', bg: 'bg-blue-100' },
  absent:  { color: 'text-zinc-500', bg: 'bg-zinc-100' },
}

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'excused', 'absent']

export function AttendanceRoster({
  gatheringId,
  groupId,
  members: initialMembers,
  canManage,
  isCompleted,
}: {
  gatheringId: string
  groupId: string
  members: Member[]
  canManage: boolean
  isCompleted: boolean
}) {
  const t = useTranslations('attendance')
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [submitting, setSubmitting] = useState(false)
  const [completing, startCompleting] = useTransition()

  function cycleStatus(profileId: string) {
    if (!canManage) return
    setMembers(prev => prev.map(m => {
      if (m.profile_id !== profileId) return m
      const current = m.attendance_status as AttendanceStatus
      const idx = STATUS_ORDER.indexOf(current)
      const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
      return { ...m, attendance_status: next }
    }))
  }

  function setStatus(profileId: string, status: AttendanceStatus) {
    if (!canManage) return
    setMembers(prev => prev.map(m =>
      m.profile_id === profileId ? { ...m, attendance_status: status } : m
    ))
  }

  const presentCount = members.filter(m => ['present', 'late'].includes(m.attendance_status)).length

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
    } catch {
      toast.error(t('toastSaveError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function completeGathering() {
    // Save attendance first
    await submitAttendance()

    startCompleting(async () => {
      try {
        const res = await fetch(`/api/gatherings/${gatheringId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
        if (!res.ok) throw new Error()
        toast.success(t('toastCompleted'))
        router.refresh()
      } catch {
        toast.error(t('toastError'))
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div>
          <h2 className="font-semibold text-zinc-900">{t('sectionTitle')}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t('presentCount', { present: presentCount, total: members.length })}
          </p>
        </div>
        {canManage && !isCompleted && (
          <div className="text-xs text-zinc-400">{t('clickHint')}</div>
        )}
        {isCompleted && (
          <span className="text-xs text-green-600 font-medium">{t('completedLabel')}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-100">
        <div
          className="h-1 bg-green-500 transition-all duration-300"
          style={{ width: `${members.length > 0 ? (presentCount / members.length) * 100 : 0}%` }}
        />
      </div>

      {/* Roster */}
      <div className="divide-y divide-zinc-50">
        {members.length === 0 ? (
          <p className="text-center py-8 text-sm text-zinc-400">{t('emptyMembers')}</p>
        ) : (
          members.map(m => {
            const status = m.attendance_status as AttendanceStatus
            const style = STATUS_STYLE[status] || STATUS_STYLE.absent
            const name = `${m.first_name_ar || m.first_name || ''} ${m.last_name_ar || m.last_name || ''}`.trim()
            const initials = (m.first_name_ar || m.first_name || '?')[0].toUpperCase()

            return (
              <div
                key={m.profile_id}
                className={`flex items-center gap-3 px-4 py-3 ${canManage && !isCompleted ? 'cursor-pointer hover:bg-zinc-50 active:bg-zinc-100' : ''} transition-colors`}
                onClick={() => canManage && !isCompleted && cycleStatus(m.profile_id)}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={m.photo_url || undefined} />
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>

                <span className="flex-1 text-sm font-medium text-zinc-900">{name}</span>

                {canManage && !isCompleted ? (
                  <div className="flex gap-1">
                    {STATUS_ORDER.map(s => (
                      <button
                        key={s}
                        onClick={e => { e.stopPropagation(); setStatus(m.profile_id, s) }}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                          status === s
                            ? `${STATUS_STYLE[s].bg} ${STATUS_STYLE[s].color}`
                            : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                        }`}
                      >
                        {t(STATUS_KEYS[s])}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${style.bg} ${style.color}`}>
                    {t(STATUS_KEYS[status] || STATUS_KEYS.absent)}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Actions */}
      {canManage && !isCompleted && members.length > 0 && (
        <div className="border-t border-zinc-100 p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={submitAttendance}
            disabled={submitting || completing}
          >
            {submitting ? t('saving') : t('saveButton')}
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={completeGathering}
            disabled={submitting || completing}
          >
            {completing ? t('completing') : t('completeButton')}
          </Button>
        </div>
      )}
    </div>
  )
}
