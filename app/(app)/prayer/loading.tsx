import { Skeleton } from '@/components/ui/skeleton'

export default function PrayerLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Prayer form card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Assigned prayers card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* My prayers card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg border space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
