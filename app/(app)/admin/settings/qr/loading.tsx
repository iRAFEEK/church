import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="rounded-lg border p-6 flex flex-col items-center space-y-4">
        <Skeleton className="h-48 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
