export default function MyGivingLoading() {
  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="animate-pulse space-y-2">
        <div className="h-7 bg-zinc-200 rounded w-32" />
        <div className="h-4 bg-zinc-100 rounded w-40" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse border rounded-lg p-4 space-y-2">
            <div className="h-3 bg-zinc-100 rounded w-16" />
            <div className="h-5 bg-zinc-200 rounded w-20" />
          </div>
        ))}
      </div>
      {/* History cards */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="animate-pulse border rounded-lg p-4 space-y-3">
          <div className="h-5 bg-zinc-200 rounded w-16" />
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex justify-between py-1">
              <div className="space-y-1">
                <div className="h-4 bg-zinc-100 rounded w-32" />
                <div className="h-3 bg-zinc-100 rounded w-20" />
              </div>
              <div className="h-4 bg-zinc-200 rounded w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
