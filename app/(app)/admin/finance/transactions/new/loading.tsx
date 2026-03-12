export default function NewTransactionLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="animate-pulse flex items-center gap-3">
        <div className="h-8 w-8 bg-zinc-200 rounded" />
        <div className="h-6 bg-zinc-200 rounded w-44" />
      </div>
      <div className="animate-pulse border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-zinc-100 rounded w-16" />
              <div className="h-9 bg-zinc-200 rounded w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-zinc-100 rounded w-24" />
          <div className="h-9 bg-zinc-200 rounded w-full" />
        </div>
      </div>
      <div className="animate-pulse border rounded-lg p-6 space-y-3">
        <div className="h-5 bg-zinc-200 rounded w-28" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            <div className="h-8 bg-zinc-200 rounded" />
            <div className="h-8 bg-zinc-200 rounded" />
            <div className="h-8 bg-zinc-200 rounded" />
            <div className="h-8 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-zinc-200 rounded w-full animate-pulse" />
    </div>
  )
}
