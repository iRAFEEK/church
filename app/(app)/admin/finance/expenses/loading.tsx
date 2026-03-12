import { FinanceListSkeleton } from '@/components/finance/FinanceSkeleton'

export default function ExpensesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-zinc-200 rounded w-44" />
          <div className="h-4 bg-zinc-100 rounded w-24" />
        </div>
        <div className="h-9 bg-zinc-200 rounded w-40" />
      </div>
      <div className="border rounded-lg p-4">
        <FinanceListSkeleton />
      </div>
    </div>
  )
}
