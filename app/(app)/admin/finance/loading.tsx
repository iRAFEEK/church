import { FinanceSkeleton } from '@/components/finance/FinanceSkeleton'

export default function FinanceLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse space-y-2">
        <div className="h-7 bg-zinc-200 rounded w-48" />
        <div className="h-4 bg-zinc-100 rounded w-32" />
      </div>
      <FinanceSkeleton />
    </div>
  )
}
