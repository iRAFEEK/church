export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-10 bg-zinc-100 rounded-xl w-48" />
      <div className="h-8 bg-zinc-100 rounded-lg w-full" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-zinc-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
