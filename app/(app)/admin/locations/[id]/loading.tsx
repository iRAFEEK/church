import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-md" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  )
}
