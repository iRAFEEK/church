import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <Skeleton className="h-12 w-96 bg-gray-800" />
    </div>
  )
}
