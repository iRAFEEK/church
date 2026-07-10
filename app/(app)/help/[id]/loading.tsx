import { Skeleton } from '@/components/ui/skeleton'

export default function HelpLessonLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      <Skeleton className="h-5 w-28" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-7 w-56" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 flex-1" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
