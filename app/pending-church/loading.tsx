export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md text-center animate-pulse">
        <div className="h-16 w-16 rounded-2xl bg-zinc-200 mx-auto mb-6" />
        <div className="h-7 w-56 bg-zinc-200 rounded mx-auto" />
        <div className="h-4 w-72 bg-zinc-100 rounded mx-auto mt-3" />
        <div className="h-16 w-full bg-zinc-100 rounded-xl mt-6" />
        <div className="h-11 w-full bg-zinc-100 rounded mt-8" />
      </div>
    </div>
  )
}
