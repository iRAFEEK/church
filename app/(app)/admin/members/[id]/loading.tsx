import { Skeleton } from '@/components/ui/skeleton'

export default function MemberDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Profile header card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3 text-center sm:text-start">
            <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-36 mx-auto sm:mx-0" />
            <div className="flex gap-2 justify-center sm:justify-start">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 mx-auto sm:mx-0" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>

        {/* Tab content placeholder (info tab) */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
