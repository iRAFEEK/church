'use client'

import { CurrencyDisplay } from './CurrencyDisplay'
import { useLocale } from 'next-intl'

interface AmountCellProps {
  amount: number
  currency?: string
  type?: 'income' | 'expense' | 'neutral'
  className?: string
}

export function AmountCell({ amount, currency = 'USD', type = 'neutral', className = '' }: AmountCellProps) {
  const locale = useLocale()
  const colorClass =
    type === 'income' ? 'text-green-600 dark:text-green-400' :
    type === 'expense' ? 'text-red-600 dark:text-red-400' :
    'text-foreground'

  return (
    <CurrencyDisplay
      amount={amount}
      currency={currency}
      locale={locale}
      className={`font-mono ${colorClass} ${className}`}
    />
  )
}
