export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="animate-pulse space-y-2">
        <div className="h-7 bg-zinc-200 rounded w-40" />
        <div className="h-4 bg-zinc-100 rounded w-56" />
      </div>
      <div className="animate-pulse border rounded-lg p-6 space-y-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-zinc-100 rounded w-28" />
            <div className="h-9 bg-zinc-200 rounded w-full" />
          </div>
        ))}
        <div className="h-10 bg-zinc-200 rounded w-full mt-4" />
      </div>
    </div>
  )
}
