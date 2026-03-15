export default function SettingsLoading() {
  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-4 pb-24">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid gap-4">
        {[1, 2].map(i => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-40 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
