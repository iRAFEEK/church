export function FinanceSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-2">
            <div className="h-3 bg-zinc-200 rounded w-1/2" />
            <div className="h-7 bg-zinc-200 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border p-6 space-y-3">
          <div className="h-4 bg-zinc-200 rounded w-1/3" />
          <div className="h-16 bg-zinc-100 rounded" />
        </div>
        <div className="rounded-lg border p-6 lg:col-span-2 space-y-3">
          <div className="h-4 bg-zinc-200 rounded w-1/4" />
          <div className="h-24 bg-zinc-100 rounded" />
        </div>
      </div>
    </div>
  )
}

export function FinanceListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-zinc-200 rounded w-2/5" />
            <div className="h-3 bg-zinc-100 rounded w-1/4" />
          </div>
          <div className="h-4 bg-zinc-200 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

export function FinanceCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="animate-pulse grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-lg border p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 bg-zinc-200 rounded w-1/2" />
            <div className="h-5 bg-zinc-100 rounded w-16" />
          </div>
          <div className="h-3 bg-zinc-100 rounded w-1/3" />
          <div className="h-1.5 bg-zinc-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}
