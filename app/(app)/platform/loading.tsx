export default function Loading() {
  return (
    <div className="px-4 md:px-6 pb-24 max-w-3xl mx-auto space-y-8 animate-pulse">
      <div className="py-4 space-y-2">
        <div className="h-7 w-56 bg-zinc-200 rounded" />
        <div className="h-4 w-72 bg-zinc-100 rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 bg-zinc-200 rounded" />
        {[0, 1].map((i) => (
          <div key={i} className="h-28 bg-zinc-100 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-zinc-100 rounded-xl" />
    </div>
  )
}
