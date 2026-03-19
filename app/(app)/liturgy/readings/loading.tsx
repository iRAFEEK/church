import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <Skeleton className="h-11 w-48" />
      {/* Header card skeleton */}
      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Reading blocks skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
