export default function Loading() {
  return (
    <div className="px-4 md:px-6 pb-24 max-w-3xl mx-auto animate-pulse">
      <div className="py-4">
        <div className="h-7 w-56 bg-zinc-200 rounded" />
        <div className="h-4 w-72 bg-zinc-100 rounded mt-2" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-zinc-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-zinc-200 rounded" />
                <div className="h-3 w-28 bg-zinc-100 rounded" />
                <div className="h-3 w-36 bg-zinc-100 rounded" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="h-11 flex-1 bg-zinc-100 rounded" />
              <div className="h-11 flex-1 bg-zinc-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
