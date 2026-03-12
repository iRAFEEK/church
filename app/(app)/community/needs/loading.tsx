export default function ChurchNeedsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-zinc-200 rounded w-40" />
          <div className="h-4 bg-zinc-100 rounded w-56" />
        </div>
        <div className="h-9 bg-zinc-200 rounded w-36" />
      </div>
      <div className="h-9 bg-zinc-100 rounded w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border p-4 space-y-3">
            <div className="h-32 bg-zinc-100 rounded" />
            <div className="h-5 bg-zinc-200 rounded w-3/4" />
            <div className="h-4 bg-zinc-100 rounded w-full" />
            <div className="flex gap-2">
              <div className="h-5 bg-zinc-100 rounded w-16" />
              <div className="h-5 bg-zinc-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
