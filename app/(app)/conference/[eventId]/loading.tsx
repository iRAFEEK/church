import { Skeleton } from '@/components/ui/skeleton'

export default function MyAssignmentLoading() {
  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <Skeleton className="h-8 w-48 mx-auto" />
      {/* Team card */}
      <div className="rounded-2xl border p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      {/* Tasks */}
      <div className="rounded-2xl border p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      {/* Broadcasts */}
      <div className="rounded-2xl border p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
