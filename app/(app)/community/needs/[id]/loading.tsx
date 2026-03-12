export default function NeedDetailLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-6 bg-zinc-100 rounded w-32" />
      <div className="h-64 bg-zinc-100 rounded-lg" />
      <div className="h-8 bg-zinc-200 rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-6 bg-zinc-100 rounded w-20" />
        <div className="h-6 bg-zinc-100 rounded w-20" />
        <div className="h-6 bg-zinc-100 rounded w-24" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-zinc-100 rounded w-full" />
        <div className="h-4 bg-zinc-100 rounded w-5/6" />
        <div className="h-4 bg-zinc-100 rounded w-4/6" />
      </div>
      <div className="h-24 bg-zinc-50 rounded-lg border" />
    </div>
  )
}
