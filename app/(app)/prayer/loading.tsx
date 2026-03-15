import { Skeleton } from '@/components/ui/skeleton'

export default function PrayerLoading() {
  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-7 w-36" />
      </div>

      {/* Submit form card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 flex-1 rounded-md" />
        </div>

        {/* Feed cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
