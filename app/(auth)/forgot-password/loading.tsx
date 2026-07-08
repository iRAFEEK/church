import { Skeleton } from '@/components/ui/skeleton'

export default function ForgotPasswordLoading() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  )
}
