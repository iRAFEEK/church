import { FinanceListSkeleton } from '@/components/finance/FinanceSkeleton'

export default function CampaignDetailLoading() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="animate-pulse flex items-start gap-3">
        <div className="h-8 w-8 bg-zinc-200 rounded" />
        <div className="space-y-1 flex-1">
          <div className="h-6 bg-zinc-200 rounded w-48" />
          <div className="h-4 bg-zinc-100 rounded w-64" />
        </div>
      </div>
      {/* Progress card */}
      <div className="animate-pulse border rounded-lg p-6 space-y-4">
        <div className="flex justify-between">
          <div className="space-y-1">
            <div className="h-8 bg-zinc-200 rounded w-32" />
            <div className="h-4 bg-zinc-100 rounded w-40" />
          </div>
          <div className="h-8 bg-zinc-200 rounded w-16" />
        </div>
        <div className="h-4 bg-zinc-200 rounded-full w-full" />
      </div>
      {/* Donations + Pledges */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <FinanceListSkeleton />
        </div>
        <div className="border rounded-lg p-4">
          <FinanceListSkeleton />
        </div>
      </div>
    </div>
  )
}
