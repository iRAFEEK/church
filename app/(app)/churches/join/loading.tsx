export default function Loading() {
  return (
    <div className="px-4 md:px-6 pb-24 max-w-lg mx-auto animate-pulse">
      <div className="py-4 space-y-2">
        <div className="h-7 w-52 bg-zinc-200 rounded" />
        <div className="h-4 w-64 bg-zinc-100 rounded" />
      </div>
      <div className="h-11 w-full bg-zinc-100 rounded-lg mb-4" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-zinc-100 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
