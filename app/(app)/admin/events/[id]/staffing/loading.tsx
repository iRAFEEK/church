import { Skeleton } from '@/components/ui/skeleton'

// This page redirects to /admin/events/[id] -- loading state is minimal
export default function Loading() {
  return (
    <div className="container mx-auto p-4">
      <Skeleton className="h-8 w-48" />
    </div>
  )
}
