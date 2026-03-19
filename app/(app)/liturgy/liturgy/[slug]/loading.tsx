import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="size-11 rounded-md shrink-0" />
      </div>
      {/* Nav skeleton */}
      <div className="flex gap-1 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full shrink-0" />
        ))}
      </div>
      {/* Content blocks skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
