import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-4 w-56 mt-1" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-full" />
        ))}
      </div>

      {/* Member cards */}
      <div className="rounded-xl border divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3.5 px-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
