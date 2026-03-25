'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Handle, Position } from '@xyflow/react'
import { Users, AlertTriangle, CheckCircle2, Clock, Circle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamWithCard } from './useMindMapLayout'

interface TeamNodeData {
  team: TeamWithCard
  color: string
  locale: string
  eventId: string
  isDropTarget?: boolean
  onTeamClick: (teamId: string) => void
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planning: { label: 'Planning', cls: 'bg-zinc-100 text-zinc-600' },
  leader_notified: { label: 'Leader notified', cls: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'In progress', cls: 'bg-amber-50 text-amber-700' },
  ready: { label: 'Ready', cls: 'bg-emerald-50 text-emerald-700' },
}

const STATUS_BAR_COLOR: Record<string, string> = {
  planning: '#d4d4d8',
  leader_notified: '#60a5fa',
  in_progress: '#fbbf24',
  ready: '#10b981',
}

function StatusIcon({ status, noLeader }: { status?: string; noLeader?: boolean }) {
  if (noLeader) return <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
  if (status === 'ready') return <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
  if (status === 'in_progress') return <Clock className="h-3 w-3 text-amber-500 shrink-0" />
  return <Circle className="h-3 w-3 text-zinc-400 shrink-0" />
}

export const TeamNodeMindMap = memo(function TeamNodeMindMap({ data }: { data: TeamNodeData }) {
  const { team, color, locale, eventId, isDropTarget, onTeamClick } = data
  const isRTL = locale.startsWith('ar')
  const teamName = isRTL ? (team.name_ar || team.name) : team.name
  const ministryName = isRTL ? (team.ministryNameAr || team.ministryName) : team.ministryName
  const status = team.cardStatus
  const noLeader = !!(ministryName && !team.assignedLeaderName)
  const barColor = noLeader ? '#ef4444' : (status ? STATUS_BAR_COLOR[status] : STATUS_BAR_COLOR.planning)
  const badge = status ? STATUS_BADGE[status] : STATUS_BADGE.planning

  return (
    <div
      className={cn(
        'rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow w-[180px] select-none border border-zinc-200 overflow-hidden',
        isDropTarget && 'ring-2 ring-primary bg-primary/5 border-primary'
      )}
      style={{ borderInlineStartWidth: 4, borderInlineStartColor: barColor, borderInlineStartStyle: 'solid' }}
    >
      {/* All-4-side handles for free-form connections */}
      <Handle type="target" position={Position.Top} id="target-top" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Top} id="source-top" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} id="source-right" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />

      <div className="px-3 py-2.5 cursor-pointer" onClick={() => onTeamClick(team.id)}>
        {/* Row 1: name + status icon */}
        <div className="flex items-start gap-1.5">
          <Users className="h-3.5 w-3.5 mt-0.5 text-zinc-400 shrink-0" />
          <p className="font-medium text-xs text-zinc-900 flex-1 leading-snug" dir="auto">{teamName}</p>
          <StatusIcon status={status} noLeader={noLeader} />
        </div>

        {/* Row 2: status badge + headcount */}
        <div className="flex items-center gap-1.5 mt-1.5 ps-5">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', badge.cls)}>
            {badge.label}
          </span>
          {team.target_headcount && (
            <span className="text-[10px] text-zinc-500" dir="ltr">{team.target_headcount}</span>
          )}
        </div>

        {/* Row 3: ministry or drop hint */}
        <div className="mt-1.5 ps-5">
          {ministryName ? (
            <p className="text-[10px] text-zinc-600 truncate" dir="auto">{ministryName}</p>
          ) : (
            <p className={cn(
              'text-[10px] text-zinc-400 italic',
              isDropTarget && 'text-primary font-medium not-italic'
            )}>
              {isDropTarget ? `Assign here` : 'Drop ministry here...'}
            </p>
          )}
        </div>
      </div>

      {/* Open Plan link */}
      {eventId && (
        <div className="border-t border-zinc-100 px-3 py-1" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/admin/events/${eventId}/conference/teams/${team.id}/plan`}
            className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            Open Plan
          </Link>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  )
})
