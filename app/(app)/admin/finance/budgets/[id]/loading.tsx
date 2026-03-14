import { FinanceListSkeleton } from '@/components/finance/FinanceSkeleton'

export default function BudgetDetailLoading() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="animate-pulse flex items-center gap-3">
        <div className="h-8 w-8 bg-zinc-200 rounded" />
        <div className="space-y-1">
          <div className="h-6 bg-zinc-200 rounded w-48" />
          <div className="h-4 bg-zinc-100 rounded w-32" />
        </div>
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse border rounded-lg p-5 text-center space-y-2">
            <div className="h-4 bg-zinc-100 rounded w-20 mx-auto" />
            <div className="h-7 bg-zinc-200 rounded w-24 mx-auto" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-4">
        <FinanceListSkeleton />
      </div>
    </div>
  )
}
