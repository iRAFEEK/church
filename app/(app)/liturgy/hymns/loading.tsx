import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      {/* Search bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-full sm:w-32" />
        <Skeleton className="h-11 w-24" />
      </div>
      {/* Hymn cards skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 flex items-center gap-3">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
