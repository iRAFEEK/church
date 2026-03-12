export default function NewExpenseLoading() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="animate-pulse flex items-center gap-3">
        <div className="h-8 w-8 bg-zinc-200 rounded" />
        <div className="h-6 bg-zinc-200 rounded w-36" />
      </div>
      <div className="animate-pulse border rounded-lg p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-zinc-100 rounded w-20" />
            <div className="h-9 bg-zinc-200 rounded w-full" />
          </div>
        ))}
        <div className="h-10 bg-zinc-200 rounded w-full mt-4" />
      </div>
    </div>
  )
}
