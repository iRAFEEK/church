import { Skeleton } from '@/components/ui/skeleton'

export default function EventDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title + badge */}
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-20 mt-2" />
      </div>

      {/* Event details card */}
      <div className="border rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Run of show segments */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="divide-y rounded-xl border overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register button */}
      <div className="flex justify-center">
        <Skeleton className="h-11 w-32" />
      </div>
    </div>
  )
}
