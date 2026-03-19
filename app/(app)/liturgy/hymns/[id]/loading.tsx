import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Tags skeleton */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      {/* Audio player skeleton */}
      <Skeleton className="h-[76px] w-full rounded-lg" />
      {/* Lyrics skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}
