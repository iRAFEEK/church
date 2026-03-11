'use client'

import { CurrencyDisplay } from './CurrencyDisplay'

interface AmountCellProps {
  amount: number
  currency?: string
  type?: 'income' | 'expense' | 'neutral'
  className?: string
}

export function AmountCell({ amount, currency = 'USD', type = 'neutral', className = '' }: AmountCellProps) {
  const colorClass =
    type === 'income' ? 'text-green-600 dark:text-green-400' :
    type === 'expense' ? 'text-red-600 dark:text-red-400' :
    'text-foreground'

  return (
    <CurrencyDisplay
      amount={amount}
      currency={currency}
      className={`font-mono tabular-nums ${colorClass} ${className}`}
    />
  )
}
