import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>

        {/* Submit button */}
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  )
}
