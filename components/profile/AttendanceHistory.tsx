'use client'

import { useTranslations } from 'next-intl'
import { formatGatheringDate } from '@/lib/gatherings'

type AttendanceRecord = {
  id: string
  status: string
  marked_at: string
  gathering: {
    id: string
    scheduled_at: string
    topic: string | null
    group: { id: string; name: string; name_ar: string | null } | null
  } | null
}

const STATUS_KEYS: Record<string, string> = {
  present: 'statusPresent',
  late: 'statusLate',
  excused: 'statusExcused',
  absent: 'statusAbsent',
}

const STATUS_COLOR: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late:    'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
  absent:  'bg-zinc-100 text-zinc-500',
}

export function AttendanceHistory({ records }: { records: AttendanceRecord[] }) {
  const t = useTranslations('attendance')

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 text-sm rounded-xl border border-zinc-200">
        {t('historyEmpty')}
      </div>
    )
  }

  const presentCount = records.filter(r => ['present', 'late'].includes(r.status)).length
  const rate = Math.round((presentCount / records.length) * 100)

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-4 rounded-xl bg-zinc-50 border border-zinc-200 p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-900">{rate}%</p>
          <p className="text-xs text-zinc-500">{t('historyRateLabel')}</p>
        </div>
        <div className="h-8 w-px bg-zinc-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-900">{presentCount}</p>
          <p className="text-xs text-zinc-500">{t('historyOutOf', { total: records.length })}</p>
        </div>
      </div>

      {/* Records */}
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        {records.map(r => {
          const g = r.gathering
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  {g?.topic || t('historyDefaultTopic')}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {g ? formatGatheringDate(g.scheduled_at) : '—'}
                  {g?.group && ` · ${g.group.name_ar || g.group.name}`}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] || ''}`}>
                {t(STATUS_KEYS[r.status] || r.status)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
