import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[56px] rounded-lg" />
        ))}
      </div>
    </div>
  )
}
