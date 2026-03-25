import { Skeleton } from '@/components/ui/skeleton'

export default function PublishLoading() {
  return (
    <div className="space-y-4 max-w-xl">
      <Skeleton className="h-7 w-32" />
      <div className="rounded-xl border p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  )
}
