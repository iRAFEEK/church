import { Skeleton } from '@/components/ui/skeleton'

export default function HelpLoading() {
  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
