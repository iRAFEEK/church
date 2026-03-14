import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white p-8 space-y-6">
      <Skeleton className="h-10 w-56 bg-zinc-800" />
      <div className="space-y-4 max-w-3xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-7 w-full bg-zinc-800" />
            <Skeleton className="h-7 w-2/3 bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
