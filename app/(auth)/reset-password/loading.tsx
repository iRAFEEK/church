import { Skeleton } from '@/components/ui/skeleton'

export default function ResetPasswordLoading() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-6 space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  )
}
