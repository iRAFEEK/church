import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header: title + badges + edit button */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* Info card: date, time, location, capacity */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-32" />
          ))}
        </div>
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Run of Show section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 rounded-lg" />
      </div>

      {/* Staffing section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-20 rounded-lg" />
      </div>

      {/* Registrations section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </div>
  )
}
