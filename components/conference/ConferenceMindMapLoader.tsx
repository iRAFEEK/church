'use client'

import dynamic from 'next/dynamic'
import type { ConferenceMindMapProps } from './ConferenceMindMap'

function BoardSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-[280px] bg-zinc-100 border-e border-zinc-200 shrink-0" />
      <div className="flex-1 bg-zinc-50 flex items-center justify-center">
        <div className="space-y-6 text-center">
          <div className="h-20 w-[240px] bg-zinc-200 rounded-2xl mx-auto" />
          <div className="flex gap-8 justify-center">
            <div className="h-[68px] w-[200px] bg-zinc-200 rounded-xl" />
            <div className="h-[68px] w-[200px] bg-zinc-200 rounded-xl" />
            <div className="h-[68px] w-[200px] bg-zinc-200 rounded-xl" />
          </div>
          <div className="flex gap-6 justify-center">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[72px] w-[180px] bg-zinc-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const ConferenceMindMapDynamic = dynamic(
  () => import('./ConferenceMindMap').then((m) => m.ConferenceMindMap),
  { ssr: false, loading: () => <BoardSkeleton /> }
)

export function ConferenceMindMapLoader(props: ConferenceMindMapProps) {
  return <ConferenceMindMapDynamic {...props} />
}
