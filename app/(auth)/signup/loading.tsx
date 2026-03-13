import { Skeleton } from '@/components/ui/skeleton'

export default function SignupLoading() {
  return (
    <div className="rounded-xl border bg-card">
      {/* Card header */}
      <div className="p-6 space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Card content */}
      <div className="p-6 pt-0 space-y-4">
        {/* Email field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Confirm password field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Submit button */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Sign in link */}
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  )
}
