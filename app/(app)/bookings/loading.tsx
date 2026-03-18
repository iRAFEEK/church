import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3 pb-24 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>

        {/* Location pills */}
        <div className="flex gap-2 px-4">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        {/* Date strip */}
        <div className="flex gap-1.5 px-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-12 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Date label */}
        <div className="px-4">
          <Skeleton className="h-5 w-40" />
        </div>

        {/* Agenda cards */}
        <div className="px-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:flex h-[calc(100vh-80px)] animate-in fade-in duration-300">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-e border-zinc-200 p-4 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          {/* Week header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-5 w-48 ms-2" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-16 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="p-4 space-y-1">
            <div className="grid grid-cols-8 gap-1">
              <div className="w-14" />
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-8 gap-1" style={{ height: 48 }}>
                <Skeleton className="w-14 h-4 mt-1" />
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-full rounded opacity-20" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
