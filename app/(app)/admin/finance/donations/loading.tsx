import { FinanceListSkeleton } from '@/components/finance/FinanceSkeleton'

export default function DonationsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-zinc-200 rounded w-36" />
          <div className="h-4 bg-zinc-100 rounded w-24" />
        </div>
        <div className="h-9 bg-zinc-200 rounded w-40" />
      </div>
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="h-3 bg-zinc-100 rounded w-1/2" />
            <div className="h-6 bg-zinc-200 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-4">
        <FinanceListSkeleton />
      </div>
    </div>
  )
}
