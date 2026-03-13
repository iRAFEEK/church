import { Skeleton } from '@/components/ui/skeleton'

export default function SelectChurchLoading() {
  return (
    <div className="rounded-xl border bg-card">
      {/* Card header */}
      <div className="p-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Card content — church list */}
      <div className="p-6 pt-0 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
