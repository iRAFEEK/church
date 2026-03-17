import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="px-4 md:px-6 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-6 w-36 mx-2" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
        <Skeleton className="h-9 w-16 rounded" />
      </div>

      {/* Filter toggles */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-zinc-200">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="py-2 flex justify-center">
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-s border-zinc-200">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[100px] border-b border-e border-zinc-200 p-1.5 bg-white">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-full mt-2 rounded" />
              <Skeleton className="h-4 w-3/4 mt-1 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden">
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-11 flex items-center justify-center">
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          ))}
        </div>
        <div className="mt-3 border-t pt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
