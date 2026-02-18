'use client'

import Link from 'next/link'
import { formatGatheringDate } from '@/lib/gatherings'

type Gathering = {
  id: string
  scheduled_at: string
  topic: string | null
  status: string
  attendance?: Array<{ count: number }>
}

const STATUS_AR: Record<string, string> = {
  scheduled: 'مجدول',
  in_progress: 'جارٍ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

export function GatheringHistory({
  gatherings,
  groupId,
}: {
  gatherings: Gathering[]
  groupId: string
}) {
  if (gatherings.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 text-sm rounded-xl border border-zinc-200">
        لا توجد اجتماعات مسجلة بعد
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
      {gatherings.map(g => {
        const count = g.attendance?.[0]?.count ?? 0
        return (
          <Link
            key={g.id}
            href={`/groups/${groupId}/gathering/${g.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900">
                {g.topic || 'اجتماع المجموعة'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {formatGatheringDate(g.scheduled_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {g.status === 'completed' && (
                <span className="text-xs text-zinc-400">{count} حضر</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[g.status] || ''}`}>
                {STATUS_AR[g.status] || g.status}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
