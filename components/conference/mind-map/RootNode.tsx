'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Building2 } from 'lucide-react'

interface RootNodeData {
  eventTitle: string
}

export const RootNode = memo(function RootNode({ data }: { data: RootNodeData }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-5 py-4 shadow-lg w-[240px] select-none">
      <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
        <Building2 className="h-5 w-5 text-zinc-300" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-white truncate" dir="auto">{data.eventTitle}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !border-zinc-500" />
    </div>
  )
})
