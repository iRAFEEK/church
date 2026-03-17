import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 pb-24 md:pb-0 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Location selector skeleton */}
      <Skeleton className="h-11 w-full rounded-md" />

      {/* Date navigator skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-11 rounded-md" />
      </div>

      {/* Time grid rows skeleton */}
      <div className="space-y-0 border rounded-lg overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border-b last:border-b-0" style={{ height: 60 }}>
            <Skeleton className="h-4 w-12 shrink-0 mt-1" />
            <Skeleton className="h-8 flex-1 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
