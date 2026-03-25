import { Skeleton } from '@/components/ui/skeleton'

export default function ResourcesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-28" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="flex items-center gap-4 rounded-xl border p-4">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      ))}
      <div className="rounded-xl border p-4">
        <Skeleton className="h-5 w-40" />
      </div>
    </div>
  )
}
