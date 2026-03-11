export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="text-5xl">📶</div>
      <h1 className="text-lg font-semibold text-zinc-900">You&apos;re offline</h1>
      <p className="text-sm text-zinc-500 max-w-xs">
        Check your connection and try again. Previously visited pages are available offline.
      </p>
      <p className="text-sm text-zinc-500 max-w-xs" dir="rtl">
        تحقق من اتصالك وحاول مرة أخرى
      </p>
    </div>
  )
}
