export default function NewNeedLoading() {
  return (
    <div className="p-6 max-w-2xl animate-pulse space-y-6">
      <div className="rounded-lg border p-6 space-y-4">
        <div className="h-6 bg-zinc-200 rounded w-40" />
        <div className="space-y-3">
          <div className="h-4 bg-zinc-100 rounded w-24" />
          <div className="h-9 bg-zinc-100 rounded" />
          <div className="h-4 bg-zinc-100 rounded w-24" />
          <div className="h-9 bg-zinc-100 rounded" />
          <div className="h-4 bg-zinc-100 rounded w-24" />
          <div className="h-20 bg-zinc-100 rounded" />
        </div>
      </div>
    </div>
  )
}
