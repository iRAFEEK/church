import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex items-center gap-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-32" />
    </div>
  )
}
