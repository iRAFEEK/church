import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileEditLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Photo card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Arabic name section */}
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* English name section */}
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Phone */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Gender + DOB */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Action buttons */}
        <div className="flex gap-3 justify-end pt-2">
          <Skeleton className="h-10 w-20 rounded-md" />
          <Skeleton className="h-10 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}
