export default function NewAccountLoading() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-9 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 bg-muted rounded animate-pulse mt-4" />
      </div>
    </div>
  )
}
