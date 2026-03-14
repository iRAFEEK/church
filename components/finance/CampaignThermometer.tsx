'use client'

import { CurrencyDisplay } from './CurrencyDisplay'

interface CampaignThermometerProps {
  raised: number
  goal: number
  currency?: string
  showAmounts?: boolean
  className?: string
}

export function CampaignThermometer({
  raised,
  goal,
  currency = 'USD',
  showAmounts = true,
  className = '',
}: CampaignThermometerProps) {
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0
  const color = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-orange-500'

  return (
    <div className={`space-y-1 ${className}`}>
      {showAmounts && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <CurrencyDisplay amount={raised} currency={currency} />
          <span className="font-medium">{pct.toFixed(0)}%</span>
          <CurrencyDisplay amount={goal} currency={currency} />
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
