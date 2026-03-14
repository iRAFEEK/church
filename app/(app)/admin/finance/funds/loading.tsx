import { FinanceCardsSkeleton } from '@/components/finance/FinanceSkeleton'

export default function FundsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-zinc-200 rounded w-24" />
          <div className="h-4 bg-zinc-100 rounded w-32" />
        </div>
        <div className="h-9 bg-zinc-200 rounded w-32" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse border rounded-lg p-4 space-y-2">
            <div className="h-3 bg-zinc-100 rounded w-20" />
            <div className="h-6 bg-zinc-200 rounded w-16" />
          </div>
        ))}
      </div>
      <FinanceCardsSkeleton count={6} />
    </div>
  )
}
