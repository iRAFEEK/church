import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md" />
        <div className="flex-1">
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
