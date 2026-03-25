import { Skeleton } from '@/components/ui/skeleton'

export default function ConferenceLoading() {
  return (
    <div className="space-y-4 pb-24">
      {/* Back link skeleton */}
      <Skeleton className="h-5 w-48" />

      {/* Tab bar skeleton */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-b-none" />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="space-y-3 pt-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-3 rounded-xl border p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
